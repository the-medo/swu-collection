import { isDeepStrictEqual } from 'node:util';
import { loadGameVersions } from '../../../play/storage/card-bundles.ts';
import { createHash, randomBytes } from 'node:crypto';
import type { Sql, TransactionSql } from 'postgres';
import { z } from 'zod';

import { principalSchema, requireSession } from './lobbies.ts';
import type { Principal } from './lobbies.ts';

const roleSchema = z.enum(['player', 'spectator']);
const purposeSchema = z.enum(['live', 'replay']);
const seatSchema = z.enum(['p1', 'p2']);
const gameIdSchema = z.string().min(1).max(128);
const grantSchema = z
  .discriminatedUnion('role', [
    principalSchema.extend({
      lobbyId: z.uuid(),
      gameId: gameIdSchema,
      purpose: purposeSchema.default('live'),
      role: z.literal('player'),
      seat: seatSchema,
      connectionEpoch: z.number().int().nonnegative().max(2_147_483_647),
    }),
    principalSchema.extend({
      lobbyId: z.uuid(),
      gameId: gameIdSchema,
      purpose: purposeSchema.default('live'),
      role: z.literal('spectator'),
      seat: z.null(),
      connectionEpoch: z.null(),
    }),
  ])
  .refine(
    grant =>
      grant.role !== 'player' ||
      (grant.purpose === 'replay' ? grant.connectionEpoch === 0 : grant.connectionEpoch > 0),
  );
/** Server-owned result of redemption. Never deserialize this from client input. */
export type ConnectionGrant = z.infer<typeof grantSchema>;
export class ConnectionError extends Error {
  constructor(
    readonly code: 'origin' | 'denied' | 'invalid-ticket' | 'incompatible' | 'revoked' | 'closed',
  ) {
    super(`Crossfire connection: ${code}`);
  }
}

async function access(
  tx: TransactionSql,
  principal: Principal,
  lobbyId: string,
  role: z.infer<typeof roleSchema>,
  locking: 'read' | 'share' | 'update-seat',
) {
  const lock = locking !== 'read';
  await requireSession(tx, principal, lock);
  const [lobby] =
    await tx`SELECT l.game_id, l.allow_spectators, l.versions, g.versions AS game_versions, g.status AS game_status
    FROM play.lobbies l JOIN play.games g ON g.id = l.game_id
    WHERE l.id = ${lobbyId} AND l.status = 'started'
    ${lock ? tx`FOR SHARE OF l` : tx``}`;
  if (!lobby) throw new ConnectionError('denied');
  if (lobby.game_status === 'abandoned') throw new ConnectionError('closed');
  if (
    !isDeepStrictEqual(lobby.versions, lobby.game_versions) ||
    !(await loadGameVersions(tx, lobby.versions)) ||
    !(await loadGameVersions(tx, lobby.game_versions))
  )
    throw new ConnectionError('incompatible');
  const [participant] = await tx`SELECT seat, connection_epoch FROM play.participants
    WHERE lobby_id = ${lobbyId} AND user_id = ${principal.userId}
    ${locking === 'update-seat' ? tx`FOR UPDATE` : lock ? tx`FOR SHARE` : tx``}`;
  if (role === 'player' ? !participant : participant || !lobby.allow_spectators)
    throw new ConnectionError('denied');
  // Row locks protect sign-out and bans; time can still pass while waiting for
  // the lobby or seat. Reject a session that expired during that wait.
  if (lock) await requireSession(tx, principal);
  return {
    gameId: lobby.game_id as string,
    seat: participant ? seatSchema.parse(participant.seat) : null,
    connectionEpoch: participant ? (participant.connection_epoch as number) : null,
  };
}

/** Check a trusted grant against live auth and seat ownership. For a command,
 * call with lock=true INSIDE the journal-append transaction, before its writes.
 * The locks serialize reconnection/revocation with that commit. A check made
 * before enqueueing a command is insufficient. Views can use read-only checks. */
export async function requireConnection(
  tx: TransactionSql,
  raw: ConnectionGrant,
  lock = false,
): Promise<ConnectionGrant> {
  const grant = grantSchema.parse(raw);
  const principal = { userId: grant.userId, sessionId: grant.sessionId };
  const current = await access(tx, principal, grant.lobbyId, grant.role, lock ? 'share' : 'read');
  if (
    current.gameId !== grant.gameId ||
    current.seat !== grant.seat ||
    (grant.purpose === 'live' && current.connectionEpoch !== grant.connectionEpoch)
  )
    throw new ConnectionError('revoked');
  return grant;
}

const digest = (ticket: string) => createHash('sha256').update(ticket).digest('hex');

/** Private admission service shared by the API issuer and future game worker.
 * No credentials or configuration are loaded implicitly. */
export class CrossfireConnections {
  constructor(
    private readonly sql: Sql,
    private readonly allowedOrigin: string,
    private readonly ttlMs = 30_000,
  ) {
    const url = new URL(allowedOrigin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== allowedOrigin)
      throw new Error('Crossfire requires an exact configured HTTP(S) origin');
    z.number().int().min(1000).max(60_000).parse(ttlMs);
  }
  #origin(origin: string | null | undefined) {
    if (origin !== this.allowedOrigin) throw new ConnectionError('origin');
  }

  async issue(
    raw: Principal,
    lobbyId: string,
    rawRole: 'player' | 'spectator',
    origin: string | null | undefined,
    rawPurpose: 'live' | 'replay' = 'live',
  ): Promise<{ ticket: string; gameId: string; expiresAt: string }> {
    this.#origin(origin);
    const principal = principalSchema.parse(raw),
      role = roleSchema.parse(rawRole),
      purpose = purposeSchema.parse(rawPurpose);
    z.uuid().parse(lobbyId);
    const ticket = randomBytes(32).toString('base64url');
    return this.sql.begin(async tx => {
      const entitlement = await access(tx, principal, lobbyId, role, 'share');
      const [row] = await tx`INSERT INTO play.connection_tickets
        (token_hash, lobby_id, game_id, user_id, session_id, role, seat, purpose, expires_at)
        VALUES (${digest(ticket)}, ${lobbyId}, ${entitlement.gameId}, ${principal.userId},
          ${principal.sessionId}, ${role}, ${entitlement.seat}, ${purpose},
          clock_timestamp() + ${this.ttlMs} * interval '1 millisecond') RETURNING expires_at`;
      return { ticket, gameId: entitlement.gameId, expiresAt: row!.expires_at.toISOString() };
    });
  }

  async redeem(
    ticket: string,
    gameId: string,
    origin: string | null | undefined,
  ): Promise<ConnectionGrant> {
    this.#origin(origin);
    gameIdSchema.parse(gameId);
    if (typeof ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ticket))
      throw new ConnectionError('invalid-ticket');
    return this.sql.begin(async tx => {
      const [row] = await tx`SELECT * FROM play.connection_tickets
        WHERE token_hash = ${digest(ticket)} FOR UPDATE`;
      if (!row || row.game_id !== gameId || row.consumed_at || !row.user_id)
        throw new ConnectionError('invalid-ticket');
      const principal = principalSchema.parse({ userId: row.user_id, sessionId: row.session_id });
      const role = roleSchema.parse(row.role),
        purpose = purposeSchema.parse(row.purpose);
      // Acquire the seat UPDATE lock directly: upgrading two simultaneous SHARE
      // locks would deadlock. Auth, lobby and seat locks have the same order as
      // command authorization, and hold entitlement stable through consumption.
      const entitlement = await access(
        tx,
        principal,
        row.lobby_id,
        role,
        purpose === 'live' ? 'update-seat' : 'share',
      );
      if (entitlement.gameId !== gameId || entitlement.seat !== row.seat)
        throw new ConnectionError('invalid-ticket');
      const consumed = await tx`UPDATE play.connection_tickets SET consumed_at = clock_timestamp()
        WHERE token_hash = ${row.token_hash} AND consumed_at IS NULL
          AND expires_at > clock_timestamp() RETURNING token_hash`;
      if (!consumed.length) throw new ConnectionError('invalid-ticket');
      let connectionEpoch: number | null = role === 'player' ? 0 : null;
      if (purpose === 'live' && role === 'player') {
        const [seat] =
          await tx`UPDATE play.participants SET connection_epoch = connection_epoch + 1, session_id = ${principal.sessionId}
          WHERE lobby_id = ${row.lobby_id} AND seat = ${row.seat} AND user_id = ${principal.userId}
          RETURNING connection_epoch`;
        if (!seat) throw new ConnectionError('denied');
        connectionEpoch = seat.connection_epoch;
      }
      // Recheck session expiry after waiting for the seat lock. Locked policy,
      // auth and seat rows remain stable through commit.
      return requireConnection(
        tx,
        grantSchema.parse({
          ...principal,
          lobbyId: row.lobby_id,
          gameId,
          role,
          purpose,
          seat: row.seat,
          connectionEpoch,
        }),
        true,
      );
    });
  }

  async revalidate(grant: ConnectionGrant): Promise<void> {
    await this.sql.begin('read only', async tx => {
      await requireConnection(tx, grant);
    });
  }

  async replayPolicy(grant: ConnectionGrant) {
    return this.sql.begin('read only', async tx => {
      await requireConnection(tx, grant);
      const [lobby] =
        await tx`SELECT hands_to_players, hands_to_spectators FROM play.lobbies WHERE id = ${grant.lobbyId}`;
      if (!lobby) throw new ConnectionError('denied');
      return {
        handsToPlayers: !!lobby.hands_to_players,
        handsToSpectators: !!lobby.hands_to_spectators,
      };
    });
  }

  /** Bounded service-maintenance hook; scheduler wiring belongs to the worker. */
  async pruneExpired(limit = 1000): Promise<number> {
    z.number().int().min(1).max(10_000).parse(limit);
    const rows = await this.sql`WITH expired AS MATERIALIZED (
      SELECT token_hash FROM play.connection_tickets WHERE expires_at <= clock_timestamp()
      ORDER BY expires_at LIMIT ${limit} FOR UPDATE SKIP LOCKED
    ) DELETE FROM play.connection_tickets t USING expired
      WHERE t.token_hash = expired.token_hash RETURNING t.token_hash`;
    return rows.length;
  }
}
