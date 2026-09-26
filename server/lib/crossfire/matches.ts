import { isDeepStrictEqual } from 'node:util';
import { activeCardVersions, loadGameVersions } from '../../../play/storage/card-bundles.ts';
import type { BundleVersions } from '../../../play/cards/version-contract.ts';
import { randomUUID } from 'node:crypto';
import type { Sql, TransactionSql } from 'postgres';
import { z } from 'zod';
import { matchReadySchema } from '../../../shared/types/crossfire-matches.ts';
import type { MatchReady, MatchView } from '../../../shared/types/crossfire-matches.ts';
import { decodeDeckSnapshot, prepareDeckSnapshot } from '../../../play/admission/decks.ts';
import type { CardIdentityCatalog, DeckSnapshot } from '../../../play/admission/decks.ts';
import { decodeState } from '../../../play/engine/checkpoint.ts';
import { versions } from '../../../play/engine/model.ts';
import { createInitialCheckpoint } from '../../../play/host/durable-game.ts';
import { insertGame } from '../../../play/storage/postgres.ts';
import { AdmissionError, principalSchema, requireSession } from './lobbies.ts';
import type { Principal } from './lobbies.ts';
import {
  resolveCrossfireCatalog,
  type CrossfireCatalog,
  type CrossfireCatalogSource,
} from './catalog.ts';

export async function registerMatch(tx: TransactionSql, lobbyId: string, checkpoint: string) {
  await tx`INSERT INTO play.matches(id) VALUES (${lobbyId})`;
  await tx`INSERT INTO play.match_games(match_id,number,lobby_id,initiative_chooser) VALUES (${lobbyId},1,${lobbyId},${decodeState(checkpoint).execution.decision!.playerId})`;
}
function pool(deck: DeckSnapshot) {
  const counts = new Map<string, number>();
  for (const row of [...deck.mainboard, ...deck.sideboard, ...deck.reserve])
    counts.set(row.cardId, (counts.get(row.cardId) ?? 0) + row.quantity);
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cardId, quantity]) => ({ cardId, quantity }));
}
/** Practice sideboarding: preserve the original pool, leader/base, without enlarging the inactive pool.
 * Inactive unsupported cards may stay out, but cannot be moved into a game. */
export function sideboardDeck(
  original: DeckSnapshot,
  mainboard: MatchReady['mainboard'],
  catalog: CardIdentityCatalog,
  gameVersions: BundleVersions = original.versions,
): DeckSnapshot {
  if (!mainboard) throw new AdmissionError('unsupported-deck');
  const counts = new Map(pool(original).map(r => [r.cardId, r.quantity]));
  const seen = new Set<string>();
  for (const row of mainboard) {
    if (seen.has(row.cardId) || row.quantity > (counts.get(row.cardId) ?? 0))
      throw new AdmissionError('unsupported-deck');
    seen.add(row.cardId);
    counts.set(row.cardId, counts.get(row.cardId)! - row.quantity);
  }
  if (
    mainboard.reduce((n, r) => n + r.quantity, 0) <
    original.mainboard.reduce((n, r) => n + r.quantity, 0)
  )
    throw new AdmissionError('unsupported-deck');
  const inactive = [...counts]
    .filter(([, n]) => n > 0)
    .map(([cardId, quantity]) => ({ cardId, quantity }));
  const pinnedCatalog = original.cardIdentities
    ? {
        ...catalog,
        ...Object.fromEntries(
          original.cardIdentities.map(card => [card.cardId, { type: card.type }]),
        ),
      }
    : catalog;
  const result = prepareDeckSnapshot(
    {
      source: {
        deckId: original.sourceDeckId,
        format: original.sourceFormat,
        kind: original.sourceKind,
      },
      leader: original.leader,
      leader2: null,
      base: original.base,
      mainboard,
      sideboard: original.sourceKind === 'normal' ? inactive : [],
      reserve: original.sourceKind === 'limited' ? inactive : [],
    },
    pinnedCatalog,
    versions.format,
    gameVersions,
  );
  if (!result.ok) throw new AdmissionError('unsupported-deck');
  return result.snapshot;
}
export class CrossfireMatches {
  constructor(
    private readonly sql: Sql,
    private readonly catalogSource: CrossfireCatalogSource,
  ) {}
  private decode(raw: unknown, catalog: CrossfireCatalog) {
    try {
      return decodeDeckSnapshot(raw, catalog);
    } catch {
      throw new AdmissionError('incompatible');
    }
  }
  private async load(tx: TransactionSql, p: Principal, lobbyId: string, lock = false) {
    // Check membership before taking a lock or returning any match metadata.
    const [membership] =
      await tx`SELECT m.match_id,p.seat FROM play.match_games m JOIN play.participants p ON p.lobby_id=m.lobby_id WHERE m.lobby_id=${lobbyId} AND p.user_id=${p.userId}`;
    if (!membership) return null;
    const [match] =
      await tx`SELECT * FROM play.matches WHERE id=${membership.match_id} ${lock ? tx`FOR UPDATE` : tx``}`;
    if (!match) return null;
    const [root] = await tx`SELECT * FROM play.lobbies WHERE id=${match.id}`;
    const people =
      await tx`SELECT * FROM play.participants WHERE lobby_id=${match.id} ORDER BY seat`;
    if (!root?.creator_user_id || people.length !== 2 || people.some(p => !p.user_id))
      throw new AdmissionError('unavailable');
    if (!(await loadGameVersions(tx, root.versions))) throw new AdmissionError('incompatible');
    if (people.some(p => !isDeepStrictEqual(p.deck_snapshot?.versions, root.versions)))
      throw new AdmissionError('incompatible');
    const games =
      await tx`SELECT mg.*,g.status,g.summary,g.versions AS game_versions,l.versions AS lobby_versions FROM play.match_games mg JOIN play.lobbies l ON l.id=mg.lobby_id JOIN play.games g ON g.id=l.game_id WHERE mg.match_id=${match.id} ORDER BY mg.number`;
    if (
      games.some(
        g =>
          !isDeepStrictEqual(g.game_versions, root.versions) ||
          !isDeepStrictEqual(g.lobby_versions, root.versions),
      )
    )
      throw new AdmissionError('incompatible');
    const current = games.at(-1);
    if (!current) throw new AdmissionError('unavailable');
    const score = { p1: 0, p2: 0 };
    for (const game of games) {
      const winner = game.summary?.result?.winner;
      if (game.status !== 'running' && (winner === 'p1' || winner === 'p2'))
        score[winner as 'p1' | 'p2']++;
    }
    const [exit] = await tx`SELECT status, seat FROM play.match_exits WHERE match_id = ${match.id}`;
    const complete = root.best_of === 1 || score.p1 >= 2 || score.p2 >= 2;
    const status: MatchView['status'] =
      exit?.status === 'forfeit' || exit?.status === 'abandoned'
        ? 'complete'
        : exit?.status === 'pending'
          ? 'finishing'
          : current.status === 'running'
            ? 'playing'
            : current.status !== 'finalized'
              ? 'finishing'
              : complete
                ? 'complete'
                : 'sideboarding';
    // Revoked/expired sessions no longer count as ready, including after restart.
    const ready =
      await tx`SELECT r.* FROM play.match_readiness r JOIN play.participants p ON p.lobby_id=${match.id} AND p.seat=r.seat JOIN public.session s ON s.id=r.session_id AND s.user_id=p.user_id JOIN public."user" u ON u.id=s.user_id WHERE r.match_id=${match.id} AND r.after_lobby_id=${current.lobby_id} AND s.expires_at > clock_timestamp() AND u.banned IS DISTINCT FROM true AND 'crossfire' = ANY(regexp_split_to_array(btrim(coalesce(u.role, '')), '[[:space:]]*,[[:space:]]*'))`;
    return {
      match,
      exit: exit ? ({ status: exit.status, seat: exit.seat } as MatchView['exit']) : null,
      root: root!,
      people,
      games,
      current,
      score,
      status,
      ready,
      seat: membership.seat as 'p1' | 'p2',
    };
  }
  private view(
    data: NonNullable<Awaited<ReturnType<CrossfireMatches['read']>>>,
    catalog: CrossfireCatalog,
  ): MatchView {
    const original = this.decode(
      data.people.find(p => p.seat === data.seat)!.deck_snapshot,
      catalog,
    );
    const own = data.ready.find(r => r.seat === data.seat && r.kind === 'next');
    // Keep the last played deck after reload when no new submission exists.
    return {
      id: data.match.id,
      exit: data.exit,
      bestOf: data.root.best_of,
      currentLobbyId: data.current.lobby_id,
      number: data.current.number,
      mySeat: data.seat,
      status: data.status,
      score: data.score,
      games: data.games.map(g => ({
        number: g.number,
        lobbyId: g.lobby_id,
        winner: g.summary?.result?.winner ?? null,
        finished: g.status !== 'running',
      })),
      ready: {
        p1: data.ready.some(r => r.seat === 'p1' && r.kind === 'next'),
        p2: data.ready.some(r => r.seat === 'p2' && r.kind === 'next'),
      },
      rematchReady: {
        p1: data.ready.some(r => r.seat === 'p1' && r.kind === 'rematch'),
        p2: data.ready.some(r => r.seat === 'p2' && r.kind === 'rematch'),
      },
      rematchLobbyId: data.match.rematch_lobby_id,
      deck: {
        minimumMain: original.mainboard.reduce((n, r) => n + r.quantity, 0),
        leader: original.leader,
        base: original.base,
        mainboard: own ? this.decode(own.deck_snapshot, catalog).mainboard : data.ownDeck.mainboard,
        pool: pool(original),
        unsupported: original.inactiveUnsupported,
      },
    };
  }
  private async read(
    tx: TransactionSql,
    p: Principal,
    lobbyId: string,
    catalog: CrossfireCatalog,
    lock = false,
  ) {
    const data = await this.load(tx, p, lobbyId, lock);
    if (!data) return null;
    const [own] =
      await tx`SELECT deck_snapshot FROM play.participants WHERE lobby_id=${data.current.lobby_id} AND seat=${data.seat} AND user_id=${p.userId}`;
    if (!own) throw new AdmissionError('unavailable');
    return { ...data, ownDeck: this.decode(own.deck_snapshot, catalog) };
  }
  async get(raw: Principal, lobbyId: string): Promise<MatchView | null> {
    const p = principalSchema.parse(raw);
    z.uuid().parse(lobbyId);
    const catalog = await resolveCrossfireCatalog(this.catalogSource);
    return this.sql.begin('isolation level repeatable read read only', async tx => {
      await requireSession(tx, p);
      const data = await this.read(tx, p, lobbyId, catalog);
      return data ? this.view(data, catalog) : null;
    });
  }
  async ready(raw: Principal, lobbyId: string, input: MatchReady): Promise<MatchView> {
    const p = principalSchema.parse(raw);
    z.uuid().parse(lobbyId);
    const choice = matchReadySchema.parse(input);
    if (choice.kind === 'rematch' && choice.mainboard !== undefined)
      throw new AdmissionError('conflict');
    const catalog = await resolveCrossfireCatalog(this.catalogSource);
    return this.sql.begin(async tx => {
      await requireSession(tx, p, true);
      const data = await this.read(tx, p, lobbyId, catalog, true);
      if (!data || data.people.some(person => !person.user_id))
        throw new AdmissionError('unavailable');
      const original = this.decode(
        data.people.find(r => r.seat === data.seat)!.deck_snapshot,
        catalog,
      );
      const snapshot =
        choice.kind === 'rematch'
          ? original
          : choice.ready
            ? sideboardDeck(original, choice.mainboard, catalog)
            : original;
      if (data.current.lobby_id !== lobbyId || data.match.rematch_lobby_id) {
        const [old] =
          await tx`SELECT deck_snapshot FROM play.match_readiness WHERE match_id=${data.match.id} AND after_lobby_id=${lobbyId} AND seat=${data.seat} AND kind=${choice.kind}`;
        if (
          choice.ready &&
          old &&
          this.decode(old.deck_snapshot, catalog).contentHash === snapshot.contentHash
        )
          return this.view(data, catalog);
        throw new AdmissionError('conflict');
      }
      if (data.exit && (choice.kind === 'next' || data.exit.status === 'pending'))
        throw new AdmissionError('conflict');
      if (data.status !== (choice.kind === 'next' ? 'sideboarding' : 'complete'))
        throw new AdmissionError('conflict');
      if (!choice.ready) {
        await tx`DELETE FROM play.match_readiness WHERE match_id=${data.match.id} AND after_lobby_id=${lobbyId} AND seat=${data.seat} AND kind=${choice.kind}`;
        return this.view((await this.read(tx, p, lobbyId, catalog))!, catalog);
      }
      await tx`INSERT INTO play.match_readiness(match_id,after_lobby_id,seat,kind,session_id,deck_snapshot) VALUES (${data.match.id},${lobbyId},${data.seat},${choice.kind},${p.sessionId},${tx.json(snapshot)}) ON CONFLICT(match_id,after_lobby_id,seat,kind) DO UPDATE SET session_id=EXCLUDED.session_id,deck_snapshot=EXCLUDED.deck_snapshot`;
      const updated = (await this.read(tx, p, lobbyId, catalog))!;
      const ready = updated.ready.filter(r => r.kind === choice.kind);
      if (ready.length === 2) {
        // Recheck and lock both approving sessions before launching the next game.
        for (const r of ready)
          await requireSession(
            tx,
            { userId: data.people.find(p => p.seat === r.seat)!.user_id, sessionId: r.session_id },
            true,
          );
        const nextId = randomUUID(),
          gameId = `game-${randomUUID()}`;
        const pinned =
          choice.kind === 'rematch' ? await activeCardVersions(tx) : data.root.versions;
        const decks = ['p1', 'p2'].map(seat =>
          this.decode(ready.find(r => r.seat === seat)!.deck_snapshot, catalog),
        );
        if (choice.kind === 'rematch')
          for (let i = 0; i < decks.length; i++)
            decks[i] = sideboardDeck(decks[i]!, decks[i]!.mainboard, catalog, pinned);
        const winner = data.current.summary?.result?.winner;
        const chooser =
          choice.kind === 'next'
            ? winner === 'p1'
              ? 'p2'
              : winner === 'p2'
                ? 'p1'
                : data.current.initiative_chooser
            : undefined;
        const checkpoint = createInitialCheckpoint({
          gameId,
          versions: pinned,
          ...(chooser ? { initiativeChooser: chooser } : {}),
          disclosure: {
            handsToPlayers: data.root.hands_to_players,
            handsToSpectators: data.root.hands_to_spectators,
          },
          players: decks.map((deck, i) => ({
            id: i === 0 ? 'p1' : 'p2',
            leader: deck.leader,
            base: deck.base,
            deck: deck.mainboard,
          })) as [
            { id: string; leader: string; base: string; deck: DeckSnapshot['mainboard'] },
            { id: string; leader: string; base: string; deck: DeckSnapshot['mainboard'] },
          ],
        });
        await insertGame(tx, checkpoint);
        await tx`INSERT INTO play.lobbies(id,creator_user_id,game_id,status,versions,best_of,allow_spectators,hands_to_players,hands_to_spectators) VALUES (${nextId},${data.root.creator_user_id},${gameId},'started',${tx.json(pinned)},${data.root.best_of},${data.root.allow_spectators},${data.root.hands_to_players},${data.root.hands_to_spectators})`;
        for (const r of ready)
          await tx`INSERT INTO play.participants(lobby_id,seat,user_id,session_id,deck_snapshot) VALUES (${nextId},${r.seat},${data.people.find(p => p.seat === r.seat)!.user_id},${r.session_id},${tx.json(decks[r.seat === 'p1' ? 0 : 1]!)})`;
        if (choice.kind === 'rematch') {
          await registerMatch(tx, nextId, checkpoint);
          await tx`UPDATE play.matches SET rematch_lobby_id=${nextId} WHERE id=${data.match.id}`;
        } else
          await tx`INSERT INTO play.match_games(match_id,number,lobby_id,initiative_chooser) VALUES (${data.match.id},${data.current.number + 1},${nextId},${chooser})`;
      }
      return this.view((await this.read(tx, p, lobbyId, catalog))!, catalog);
    });
  }
}
