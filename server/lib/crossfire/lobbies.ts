import { hasCrossfireAccess } from '../../../shared/lib/auth/roles.ts';
import { isDeepStrictEqual } from 'node:util';
import {
  initializeCardBundles,
  activeCardVersions,
  loadGameVersions,
} from '../../../play/storage/card-bundles.ts';
import type { BundleVersions } from '../../../play/cards/version-contract.ts';
import { notifyInvitation } from './invitationEvents.ts';
import type { CrossfireInvitation, CrossfireTeammate } from '../../../shared/types/crossfire.ts';
import { registerMatch } from './matches.ts';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { Sql, TransactionSql } from 'postgres';
import { z } from 'zod';
import { versions } from '../../../play/engine/model.ts';
import { createInitialCheckpoint } from '../../../play/host/durable-game.ts';
import { insertGame, stateDigest } from '../../../play/storage/postgres.ts';
import { decodeDeckSnapshot, prepareDeckSnapshot } from '../../../play/admission/decks.ts';
import { readDeckInputInTransaction } from './readDeckInput.ts';
import {
  resolveCrossfireCatalog,
  type CrossfireCatalog,
  type CrossfireCatalogSource,
} from './catalog.ts';
import { crossfirePolicySchema as policySchema } from '../../../shared/types/crossfire.ts';
import type {
  CrossfirePolicy,
  CrossfireLobby,
  CrossfireDeckReadiness,
} from '../../../shared/types/crossfire.ts';

export const principalSchema = z.strictObject({
  userId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
});
export type Principal = z.infer<typeof principalSchema>;
export { policySchema };
export type LobbyPolicy = CrossfirePolicy;
export type LobbyView = CrossfireLobby;
export class AdmissionError extends Error {
  constructor(
    readonly code:
      | 'unauthenticated'
      | 'forbidden'
      | 'unavailable'
      | 'deck-unavailable'
      | 'unsupported-deck'
      | 'policy-mismatch'
      | 'conflict'
      | 'incompatible',
  ) {
    super(`Crossfire admission: ${code}`);
  }
}

/** Main API passes its Better Auth identity, never identity fields from a body.
 * The database check also catches removed/expired sessions and banned accounts. */
export async function requireSession(
  tx: TransactionSql,
  raw: Principal,
  lock = false,
): Promise<Principal> {
  const principal = principalSchema.parse(raw);
  const [row] =
    await tx`SELECT s.id, u.role FROM public.session s JOIN public."user" u ON u.id = s.user_id
    WHERE s.id = ${principal.sessionId} AND s.user_id = ${principal.userId}
      AND s.expires_at > clock_timestamp() AND u.banned IS DISTINCT FROM true
      ${lock ? tx`FOR SHARE OF s, u` : tx``}`;
  if (!row) throw new AdmissionError('unauthenticated');
  if (!hasCrossfireAccess(row.role)) throw new AdmissionError('forbidden');
  return principal;
}
function policy(row: Record<string, any>): LobbyPolicy {
  return policySchema.parse({
    allowSpectators: row.allow_spectators,
    handsToPlayers: row.hands_to_players,
    handsToSpectators: row.hands_to_spectators,
  });
}
async function assertCurrent(tx: TransactionSql, row: Record<string, any>) {
  if (!(await loadGameVersions(tx, row.versions))) throw new AdmissionError('incompatible');
}
async function view(
  tx: TransactionSql,
  lobbyId: string,
  userId: string,
): Promise<LobbyView | null> {
  const [row] =
    await tx`SELECT l.id, l.status, l.best_of, l.expires_at, l.show_leader, l.creator_user_id, i.lobby_id AS directed, i.recipient_user_id, u.name AS host_name, p.deck_snapshot->>'leader' AS leader_id, p.deck_snapshot->>'base' AS base_id, l.game_id, allow_spectators, hands_to_players, hands_to_spectators, g.provenance, g.versions AS game_versions, l.versions, e.status AS exit_status, e.seat AS exit_seat
    FROM play.lobbies l LEFT JOIN play.games g ON g.id = l.game_id
    LEFT JOIN play.match_games mg ON mg.lobby_id = l.id
    LEFT JOIN play.match_exits e ON e.match_id = mg.match_id
    LEFT JOIN play.invitations i ON i.lobby_id = l.id
    LEFT JOIN public."user" u ON u.id = l.creator_user_id
    LEFT JOIN play.participants p ON p.lobby_id = l.id AND p.seat = 'p1' WHERE l.id = ${lobbyId} AND creator_user_id IS NOT NULL`;
  if (
    !row ||
    (row.directed &&
      row.status !== 'started' &&
      row.creator_user_id !== userId &&
      row.recipient_user_id !== userId)
  )
    return null;
  const seats = await tx`SELECT seat, user_id FROM play.participants WHERE lobby_id = ${lobbyId}`;
  return {
    id: row.id,
    compatible:
      (await loadGameVersions(tx, row.versions)) &&
      (!row.game_versions || isDeepStrictEqual(row.versions, row.game_versions)),
    exit: row.exit_status ? { status: row.exit_status, seat: row.exit_seat } : null,
    bestOf: row.best_of,
    status:
      row.status === 'waiting' && new Date(row.expires_at).getTime() <= Date.now()
        ? 'expired'
        : row.status,
    expiresAt: new Date(row.expires_at).toISOString(),
    showLeader: row.show_leader,
    host: {
      name: row.host_name ?? 'Player',
      ...(row.show_leader || row.creator_user_id === userId
        ? { leaderId: row.leader_id, baseId: row.base_id }
        : {}),
    },
    practice: row.provenance?.kind === 'practice',
    gameId: row.game_id,
    policy: policy(row),
    seats: seats.length,
    mySeat: seats.find(s => s.user_id === userId)?.seat ?? null,
  };
}

/** Link-based development lobbies: the creator may share the opaque lobby ID.
 * Both seats and the initial private game commit together when the second joins.
 * No public listing, ticket, socket, deck-source link or raw snapshot is exposed. */
export class CrossfireLobbies {
  constructor(
    private readonly sql: Sql,
    private readonly catalogSource: CrossfireCatalogSource,
  ) {}

  async #prepare(
    tx: TransactionSql,
    principal: Principal,
    deckId: string,
    pinned?: BundleVersions,
    suppliedCatalog?: CrossfireCatalog,
  ) {
    const catalog = suppliedCatalog ?? (await resolveCrossfireCatalog(this.catalogSource));
    // The proxy executes existing Drizzle reads on this exact transaction.
    // It neither opens a nested transaction nor mutates client parser options.
    const input = await readDeckInputInTransaction(
      drizzle(async (query, params) => ({ rows: await tx.unsafe(query, params).values() })),
      principal.userId,
      deckId,
      catalog,
    );
    if (!input) throw new AdmissionError('deck-unavailable');
    return prepareDeckSnapshot(
      input,
      catalog,
      versions.format,
      pinned ?? (await activeCardVersions(tx)),
    );
  }
  async #snapshot(
    tx: TransactionSql,
    principal: Principal,
    deckId: string,
    pinned?: BundleVersions,
    catalog?: CrossfireCatalog,
  ) {
    const result = await this.#prepare(tx, principal, deckId, pinned, catalog);
    if (!result.ok) throw new AdmissionError('unsupported-deck');
    return result.snapshot;
  }
  /** Advisory only; create/join freeze and validate the deck again. */
  async inspectDeck(raw: Principal, deckId: string): Promise<CrossfireDeckReadiness> {
    const principal = principalSchema.parse(raw);
    z.uuid().parse(deckId);
    await initializeCardBundles(this.sql);
    return this.sql.begin('isolation level repeatable read read only', async tx => {
      await requireSession(tx, principal);
      const result = await this.#prepare(tx, principal, deckId);
      return { ready: result.ok, issues: result.ok ? [] : result.issues };
    });
  }
  async create(
    raw: Principal,
    deckId: string,
    rawPolicy: LobbyPolicy,
    bestOf: 1 | 3 = 1,
    showLeader = true,
    recipientId?: string,
  ): Promise<LobbyView> {
    const principal = principalSchema.parse(raw);
    const proposed = policySchema.parse(rawPolicy);
    z.union([z.literal(1), z.literal(3)]).parse(bestOf);
    z.uuid().parse(deckId);
    await initializeCardBundles(this.sql);
    const id = randomUUID();
    const attempt = () =>
      this.sql.begin('isolation level serializable', async tx => {
        await requireSession(tx, principal);
        // Serialize invitation creation for this sender, including concurrent tabs.
        await tx`SELECT id FROM public."user" WHERE id = ${principal.userId} FOR UPDATE`;
        if (recipientId) {
          if (recipientId === principal.userId) throw new AdmissionError('unavailable');
          const eligible = await tx`SELECT u.id, u.role FROM public."user" u
          WHERE u.id = ${recipientId} AND u.banned IS DISTINCT FROM true
          AND EXISTS (SELECT 1 FROM public.team_member mine JOIN public.team_member theirs
            ON mine.team_id = theirs.team_id WHERE mine.user_id = ${principal.userId} AND theirs.user_id = u.id)`;
          if (!eligible.length || !hasCrossfireAccess(eligible[0]!.role))
            throw new AdmissionError('unavailable');
          const duplicate =
            await tx`SELECT l.id FROM play.lobbies l JOIN play.invitations i ON i.lobby_id = l.id
          WHERE l.creator_user_id = ${principal.userId} AND i.recipient_user_id = ${recipientId}
          AND l.status = 'waiting' AND l.expires_at > clock_timestamp()`;
          if (duplicate.length) throw new AdmissionError('conflict');
        }
        const pending = await tx`SELECT count(*)::int AS count FROM play.lobbies
        WHERE creator_user_id = ${principal.userId} AND status = 'waiting' AND expires_at > clock_timestamp()`;
        if (pending[0]!.count >= 10) throw new AdmissionError('conflict');
        const snapshot = await this.#snapshot(tx, principal, deckId);
        await tx`INSERT INTO play.lobbies (id, creator_user_id, versions, allow_spectators, hands_to_players, hands_to_spectators, best_of, show_leader)
        VALUES (${id}, ${principal.userId}, ${tx.json(snapshot.versions)}, ${proposed.allowSpectators}, ${proposed.handsToPlayers}, ${proposed.handsToSpectators}, ${bestOf}, ${showLeader})`;
        await tx`INSERT INTO play.participants (lobby_id, seat, user_id, session_id, deck_snapshot)
        VALUES (${id}, 'p1', ${principal.userId}, ${principal.sessionId}, ${tx.json(snapshot)})`;
        if (recipientId)
          await tx`INSERT INTO play.invitations (lobby_id, recipient_user_id) VALUES (${id}, ${recipientId})`;
        await notifyInvitation(tx, id);
        return (await view(tx, id, principal.userId))!;
      });
    // Serializable reads can conflict with an unrelated concurrent insert. All
    // effects above are transactional, so retry the complete frozen-deck admission.
    for (let tries = 0; ; tries++) {
      try {
        return await attempt();
      } catch (error) {
        if ((error as { code?: string }).code !== '40001') throw error;
        if (tries >= 2) throw new AdmissionError('conflict');
      }
    }
  }

  async get(raw: Principal, lobbyId: string): Promise<LobbyView | null> {
    const principal = principalSchema.parse(raw);
    z.uuid().parse(lobbyId);
    return this.sql.begin('isolation level repeatable read read only', async tx => {
      await requireSession(tx, principal);
      return view(tx, lobbyId, principal.userId);
    });
  }
  async join(
    raw: Principal,
    lobbyId: string,
    deckId: string,
    acceptedPolicy: LobbyPolicy,
    acceptedBestOf: 1 | 3 = 1,
  ): Promise<LobbyView> {
    const principal = principalSchema.parse(raw),
      accepted = policySchema.parse(acceptedPolicy);
    z.uuid().parse(lobbyId);
    z.uuid().parse(deckId);
    try {
      return await this.sql.begin('isolation level repeatable read', async tx => {
        await requireSession(tx, principal);
        const [lobby] = await tx`SELECT * FROM play.lobbies WHERE id = ${lobbyId} FOR UPDATE`;
        if (!lobby || !lobby.creator_user_id || ['cancelled', 'expired'].includes(lobby.status))
          throw new AdmissionError('unavailable');
        const [directed] =
          await tx`SELECT recipient_user_id FROM play.invitations WHERE lobby_id = ${lobbyId}`;
        if (
          directed &&
          directed.recipient_user_id !== principal.userId &&
          lobby.creator_user_id !== principal.userId
        )
          throw new AdmissionError('unavailable');
        if (lobby.status === 'waiting' && new Date(lobby.expires_at).getTime() <= Date.now())
          throw new AdmissionError('unavailable');
        await assertCurrent(tx, lobby);
        if (acceptedBestOf !== lobby.best_of) throw new AdmissionError('policy-mismatch');
        if (stateDigest(JSON.stringify(accepted)) !== stateDigest(JSON.stringify(policy(lobby))))
          throw new AdmissionError('policy-mismatch');
        const existing =
          await tx`SELECT seat, user_id, session_id, deck_snapshot FROM play.participants WHERE lobby_id = ${lobbyId} ORDER BY seat`;
        const mine = existing.find(s => s.user_id === principal.userId);
        if (mine) {
          // Recover a lost join response without replacing the immutable deck.
          if (lobby.status === 'started' && mine.deck_snapshot.sourceDeckId === deckId)
            return (await view(tx, lobbyId, principal.userId))!;
          throw new AdmissionError('conflict');
        }
        if (lobby.status !== 'waiting' || existing.length !== 1 || existing[0]!.seat !== 'p1')
          throw new AdmissionError('conflict');
        const first = existing[0]!;
        if (!first.user_id) throw new AdmissionError('unavailable');
        await requireSession(tx, { userId: first.user_id, sessionId: first.session_id });
        if (!isDeepStrictEqual(first.deck_snapshot?.versions, lobby.versions))
          throw new AdmissionError('incompatible');
        const catalog = await resolveCrossfireCatalog(this.catalogSource);
        const firstDeck = decodeDeckSnapshot(first.deck_snapshot, catalog);
        const secondDeck = await this.#snapshot(tx, principal, deckId, lobby.versions, catalog);
        const gameId = `game-${randomUUID()}`;
        const checkpoint = createInitialCheckpoint({
          gameId,
          versions: lobby.versions,
          disclosure: {
            handsToPlayers: accepted.handsToPlayers,
            handsToSpectators: accepted.handsToSpectators,
          },
          players: [firstDeck, secondDeck].map((snapshot, n) => ({
            id: n === 0 ? 'p1' : 'p2',
            leader: snapshot.leader,
            base: snapshot.base,
            deck: snapshot.mainboard,
          })) as [
            { id: string; leader: string; base: string; deck: typeof firstDeck.mainboard },
            { id: string; leader: string; base: string; deck: typeof secondDeck.mainboard },
          ],
        });
        await insertGame(tx, checkpoint);
        await tx`INSERT INTO play.participants (lobby_id, seat, user_id, session_id, deck_snapshot)
          VALUES (${lobbyId}, 'p2', ${principal.userId}, ${principal.sessionId}, ${tx.json(secondDeck)})`;
        const started = await tx`UPDATE play.lobbies SET status = 'started', game_id = ${gameId}
          WHERE id = ${lobbyId} AND expires_at > clock_timestamp() RETURNING id`;
        if (!started.length) throw new AdmissionError('unavailable');
        await notifyInvitation(tx, lobbyId);
        await registerMatch(tx, lobbyId, checkpoint);
        return (await view(tx, lobbyId, principal.userId))!;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '40001') throw new AdmissionError('conflict');
      throw error;
    }
  }
  async cancel(raw: Principal, lobbyId: string): Promise<void> {
    const principal = principalSchema.parse(raw);
    z.uuid().parse(lobbyId);
    await this.sql.begin(async tx => {
      await requireSession(tx, principal);
      const rows = await tx`UPDATE play.lobbies SET status = 'cancelled' WHERE id = ${lobbyId}
        AND creator_user_id = ${principal.userId} AND status = 'waiting' RETURNING id`;
      if (!rows.length) throw new AdmissionError('conflict');
      await notifyInvitation(tx, lobbyId);
    });
  }
  async invitations(raw: Principal): Promise<CrossfireInvitation[]> {
    return this.sql.begin('isolation level repeatable read read only', async tx => {
      const principal = await requireSession(tx, raw);
      const rows = await tx`SELECT l.id, l.creator_user_id, l.expires_at, l.show_leader,
        u.id AS player_id, u.name, p.deck_snapshot->>'leader' AS leader_id, p.deck_snapshot->>'base' AS base_id
        FROM play.lobbies l JOIN play.invitations i ON i.lobby_id = l.id
        JOIN public."user" u ON u.id = CASE WHEN l.creator_user_id = ${principal.userId}
          THEN i.recipient_user_id ELSE l.creator_user_id END
        JOIN play.participants p ON p.lobby_id = l.id AND p.seat = 'p1'
        WHERE (i.recipient_user_id = ${principal.userId} OR l.creator_user_id = ${principal.userId})
          AND l.status = 'waiting' AND l.expires_at > clock_timestamp()
        ORDER BY l.created_at DESC LIMIT 100`;
      return rows.map(row => ({
        lobbyId: row.id,
        direction: row.creator_user_id === principal.userId ? 'outgoing' : 'incoming',
        player: { id: row.player_id, name: row.name },
        expiresAt: new Date(row.expires_at).toISOString(),
        ...(row.show_leader || row.creator_user_id === principal.userId
          ? { leaderId: row.leader_id, baseId: row.base_id }
          : {}),
      }));
    });
  }
  async teammates(raw: Principal): Promise<CrossfireTeammate[]> {
    return this.sql.begin('isolation level repeatable read read only', async tx => {
      const principal = await requireSession(tx, raw);
      return [
        ...(await tx`SELECT DISTINCT u.id, u.name, u.image FROM public.team_member mine
        JOIN public.team_member theirs ON theirs.team_id = mine.team_id
        JOIN public."user" u ON u.id = theirs.user_id
        WHERE mine.user_id = ${principal.userId} AND u.id <> ${principal.userId}
          AND u.banned IS DISTINCT FROM true
          AND 'crossfire' = ANY(regexp_split_to_array(btrim(coalesce(u.role, '')), '[[:space:]]*,[[:space:]]*'))
          ORDER BY u.name, u.id LIMIT 500`),
      ] as CrossfireTeammate[];
    });
  }
  async decline(raw: Principal, lobbyId: string): Promise<void> {
    z.uuid().parse(lobbyId);
    await this.sql.begin(async tx => {
      const principal = await requireSession(tx, raw);
      const rows = await tx`UPDATE play.lobbies l SET status = 'cancelled'
        FROM play.invitations i WHERE l.id = ${lobbyId} AND i.lobby_id = l.id
        AND i.recipient_user_id = ${principal.userId} AND l.status = 'waiting' RETURNING l.id`;
      if (!rows.length) throw new AdmissionError('conflict');
      await notifyInvitation(tx, lobbyId);
    });
  }
}
