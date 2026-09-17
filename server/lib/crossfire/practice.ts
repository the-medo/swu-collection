import { hasCrossfireAccess } from '../../../shared/lib/auth/roles.ts';
import { loadGameVersions } from '../../../play/storage/card-bundles.ts';
import { historyHandle } from '../../../play/history/handles.ts';
import type { Sql } from 'postgres';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { insertGame, checkpointMetadata, stateDigest } from '../../../play/storage/postgres.ts';
import { activityBases, activityLeaders } from './activity.ts';
import type { CrossfirePracticeRequest } from '../../../shared/types/crossfire-activity.ts';
import { principalSchema, requireSession, AdmissionError } from './lobbies.ts';
import type { Principal } from './lobbies.ts';
import { requireConnection } from './connections.ts';
import type { ConnectionGrant } from './connections.ts';

export class CrossfirePractice {
  constructor(private readonly sql: Sql) {}
  async request(raw: Principal, bookmarkId: string, requestId: string): Promise<void> {
    const p = principalSchema.parse(raw);
    z.uuid().parse(bookmarkId);
    z.uuid().parse(requestId);
    await this.sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${p.userId}, 258))`;
      await requireSession(tx, p, true);
      const [old] =
        await tx`SELECT requester_id FROM play.practice_requests WHERE id = ${requestId}`;
      if (old) {
        if (old.requester_id !== p.userId) throw new AdmissionError('unavailable');
        return;
      }
      const [source] =
        await tx`SELECT b.game_id,b.position,b.branch,b.label,g.versions,g.history_key,g.sequence,opponent.user_id AS opponent
        FROM play.bookmarks b JOIN play.games g ON g.id = b.game_id AND g.status = 'finalized'
        JOIN play.lobbies l ON l.game_id = g.id
        JOIN play.participants own ON own.lobby_id = l.id AND own.user_id = ${p.userId}
        JOIN play.participants opponent ON opponent.lobby_id = l.id AND opponent.seat <> own.seat
        WHERE b.id = ${bookmarkId} AND b.user_id = ${p.userId}`;
      if (
        !source?.opponent ||
        source.position ===
          historyHandle(source.history_key, source.game_id, 'position', source.sequence)
      )
        throw new AdmissionError('unavailable');
      if (!(await loadGameVersions(tx, source.versions))) throw new AdmissionError('incompatible');
      const [count] =
        await tx`SELECT count(*)::int AS n FROM play.practice_requests WHERE requester_id = ${p.userId} AND status = 'pending' AND expires_at > now()`;
      if (count!.n >= 10) throw new AdmissionError('conflict');
      await tx`INSERT INTO play.practice_requests (id,source_game_id,requester_id,opponent_id,position,branch,label,game_id,lobby_id,expires_at)
        VALUES (${requestId},${source.game_id},${p.userId},${source.opponent},${source.position},${source.branch},${source.label},${'cf-' + randomUUID()},${randomUUID()},clock_timestamp()+interval '24 hours')`;
    });
  }
  async list(raw: Principal): Promise<CrossfirePracticeRequest[]> {
    const p = principalSchema.parse(raw);
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, p);
      const rows =
        await tx`SELECT r.*,l.id AS source_lobby, ${activityLeaders(tx, p.userId)} AS leaders,
        ${activityBases(tx, p.userId)} AS bases FROM play.practice_requests r JOIN play.lobbies l ON l.game_id = r.source_game_id
        WHERE (r.requester_id = ${p.userId} OR r.opponent_id = ${p.userId}) AND (r.status = 'accepted' OR (r.status = 'pending' AND r.expires_at > now()))
        ORDER BY r.created_at DESC,r.id DESC LIMIT 100`;
      return rows.map(r => ({
        id: r.id,
        lobbyId: r.source_lobby,
        leaders: r.leaders,
        bases: r.bases,
        position: r.position,
        branch: r.branch,
        label: r.label,
        mine: r.requester_id === p.userId,
        status: r.status,
        expiresAt: r.expires_at.toISOString(),
        createdLobbyId: r.status === 'accepted' ? r.lobby_id : null,
      }));
    });
  }
  async decline(raw: Principal, id: string) {
    const p = principalSchema.parse(raw);
    z.uuid().parse(id);
    await this.sql.begin(async tx => {
      await requireSession(tx, p, true);
      await tx`UPDATE play.practice_requests SET status = 'declined' WHERE id = ${id} AND status = 'pending' AND (requester_id = ${p.userId} OR opponent_id = ${p.userId})`;
    });
  }
  async prepare(grant: ConnectionGrant, id: string) {
    z.uuid().parse(id);
    return this.sql.begin('read only', async tx => {
      await requireConnection(tx, grant);
      if (grant.role !== 'player' || grant.purpose !== 'replay')
        throw new AdmissionError('unavailable');
      const [row] =
        await tx`SELECT r.* FROM play.practice_requests r JOIN play.games g ON g.id = r.source_game_id AND g.status = 'finalized'
        WHERE r.id = ${id} AND r.source_game_id = ${grant.gameId} AND r.opponent_id = ${grant.userId}
        AND (r.status = 'accepted' OR (r.status = 'pending' AND r.expires_at > clock_timestamp()))`;
      if (!row) throw new AdmissionError('unavailable');
      return {
        position: row.position as string,
        branch: row.branch as string,
        gameId: row.game_id as string,
        lobbyId: row.lobby_id as string,
        accepted: row.status === 'accepted',
      };
    });
  }
  /** The isolated history executor constructs this candidate; browsers never supply a checkpoint. */
  async accept(
    grant: ConnectionGrant,
    id: string,
    checkpoint: string,
    sourceHash: string,
  ): Promise<string> {
    const meta = checkpointMetadata(checkpoint);
    return this.sql.begin(async tx => {
      const [request] = await tx`SELECT * FROM play.practice_requests WHERE id = ${id} FOR UPDATE`;
      await requireConnection(tx, grant, true);
      if (
        !request ||
        grant.role !== 'player' ||
        grant.purpose !== 'replay' ||
        request.opponent_id !== grant.userId ||
        request.source_game_id !== grant.gameId
      )
        throw new AdmissionError('unavailable');
      if (request.status === 'accepted') return request.lobby_id as string;
      if (request.status !== 'pending' || request.expires_at <= new Date())
        throw new AdmissionError('conflict');
      const [source] =
        await tx`SELECT status,versions FROM play.games WHERE id = ${grant.gameId} FOR SHARE`;
      if (
        source?.status !== 'finalized' ||
        meta.gameId !== request.game_id ||
        stateDigest(JSON.stringify(meta.versions)) !== stateDigest(JSON.stringify(source.versions))
      )
        throw new AdmissionError('incompatible');
      const seats =
        await tx`SELECT p.seat,p.user_id,p.deck_snapshot,u.role FROM play.participants p JOIN "user" u ON u.id = p.user_id WHERE p.lobby_id = ${grant.lobbyId} AND u.banned IS DISTINCT FROM true FOR SHARE OF p,u`;
      if (
        seats.length !== 2 ||
        seats.some(s => !hasCrossfireAccess(s.role)) ||
        !seats.some(s => s.user_id === request.requester_id) ||
        !seats.some(s => s.user_id === request.opponent_id)
      )
        throw new AdmissionError('unavailable');
      await insertGame(tx, checkpoint);
      const provenance = {
        kind: 'practice',
        sourceGameId: grant.gameId,
        position: request.position,
        branch: request.branch,
        sourceHash,
      };
      await tx`UPDATE play.games SET provenance = ${tx.json(provenance)} WHERE id = ${request.game_id}`;
      await tx`INSERT INTO play.lobbies (id,creator_user_id,game_id,status,versions) VALUES (${request.lobby_id},${request.requester_id},${request.game_id},'started',${tx.json(meta.versions)})`;
      for (const seat of seats)
        await tx`INSERT INTO play.participants (lobby_id,seat,user_id,session_id,deck_snapshot)
        VALUES (${request.lobby_id},${seat.seat},${seat.user_id},${'practice:' + id},${tx.json(seat.deck_snapshot)})`;
      await tx`UPDATE play.practice_requests SET status = 'accepted' WHERE id = ${id}`;
      return request.lobby_id as string;
    });
  }
}
