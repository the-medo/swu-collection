import { isDeepStrictEqual } from 'node:util';
import { loadGameVersions } from '../../../play/storage/card-bundles.ts';
import { randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { stateDigest } from '../../../play/storage/integrity.ts';
import { refreshMatchStatistics } from '../../../play/statistics/matches.ts';
import { notifyGame } from '../../../play/storage/game-events.ts';
import type { GameWorker } from '../../../play/worker/games.ts';
import { AdmissionError, principalSchema, requireSession, type Principal } from './lobbies.ts';
import type { CrossfireExit } from '../../../shared/types/crossfire.ts';

export class CrossfireExits {
  constructor(private readonly sql: Sql) {}

  /** The account authorizes a durable request; its game socket/session ticket is irrelevant. */
  async leave(raw: Principal, lobbyId: string): Promise<CrossfireExit | null> {
    const p = principalSchema.parse(raw);
    z.uuid().parse(lobbyId);
    return this.sql.begin(async tx => {
      await requireSession(tx, p, true);
      const [membership] =
        await tx`SELECT coalesce(mg.match_id, l.id) AS match_id, p.seat, mg.match_id IS NULL AS legacy
        FROM play.lobbies l JOIN play.participants p ON p.lobby_id = l.id
        LEFT JOIN play.match_games mg ON mg.lobby_id = l.id
        WHERE l.id = ${lobbyId} AND l.status = 'started' AND p.user_id = ${p.userId}`;
      if (!membership) throw new AdmissionError('unavailable');
      if (membership.legacy) {
        // Early development games predate match tracking. Adopt metadata only;
        // the current or obsolete checkpoint is never decoded for this repair.
        await tx`INSERT INTO play.matches(id) VALUES (${lobbyId}) ON CONFLICT DO NOTHING`;
        await tx`INSERT INTO play.match_games(match_id, number, lobby_id, initiative_chooser)
          VALUES (${lobbyId}, 1, ${lobbyId}, 'p1') ON CONFLICT DO NOTHING`;
      }
      // Same lock as sideboarding/rematches. Always operate on the latest game,
      // even when the user opened an earlier board in this match.
      await tx`SELECT id FROM play.matches WHERE id = ${membership.match_id} FOR UPDATE`;
      const [current] = await tx`SELECT g.*, l.best_of, l.versions AS lobby_versions
        FROM play.match_games mg JOIN play.lobbies l ON l.id = mg.lobby_id
        JOIN play.games g ON g.id = l.game_id WHERE mg.match_id = ${membership.match_id}
        ORDER BY mg.number DESC LIMIT 1 FOR UPDATE OF g`;
      if (!current) throw new AdmissionError('unavailable');
      await requireSession(tx, p);
      const [prior] =
        await tx`SELECT status, seat FROM play.match_exits WHERE match_id = ${membership.match_id}`;
      const incompatible =
        !isDeepStrictEqual(current.versions, current.lobby_versions) ||
        !(await loadGameVersions(tx, current.versions)) ||
        !(await loadGameVersions(tx, current.lobby_versions));
      if (prior && (prior.status !== 'pending' || !incompatible))
        return { status: prior.status, seat: prior.seat };
      const games = await tx`SELECT g.status, g.summary FROM play.match_games mg
        JOIN play.lobbies l ON l.id = mg.lobby_id JOIN play.games g ON g.id = l.game_id
        WHERE mg.match_id = ${membership.match_id}`;
      const wins = (seat: string) =>
        games.filter(g => g.status !== 'running' && g.summary?.result?.winner === seat).length;
      if (
        current.status !== 'running' &&
        (current.best_of === 1 || wins('p1') >= 2 || wins('p2') >= 2)
      )
        return null;
      const status = incompatible
        ? 'abandoned'
        : current.status === 'running'
          ? 'pending'
          : 'forfeit';
      await tx`INSERT INTO play.match_exits(match_id, game_id, request_id, seat, status, closed_at)
        VALUES (${membership.match_id}, ${current.id}, ${randomUUID()}, ${membership.seat}, ${status},
          ${status === 'pending' ? tx`NULL` : tx`clock_timestamp()`})
        ON CONFLICT(match_id) DO UPDATE SET status = 'abandoned', closed_at = clock_timestamp()`;
      if (status === 'abandoned') {
        // No old codec/engine is loaded. Revoking the lease fences every old host.
        // Checkpoints, hashes and journals remain intact for future diagnosis.
        await tx`UPDATE play.games SET status = 'abandoned', owner_id = NULL, lease_until = NULL,
          fence = fence + 1, ended_at = clock_timestamp(), updated_at = clock_timestamp()
          WHERE id = ${current.id} AND status = 'running'`;
        await tx`UPDATE play.undo_requests SET status = 'expired' WHERE game_id = ${current.id} AND status = 'pending'`;
      }
      await tx`DELETE FROM play.match_readiness WHERE match_id = ${membership.match_id}`;
      await refreshMatchStatistics(tx, membership.match_id);
      await notifyGame(tx, current.id);
      return { status, seat: prior?.seat ?? membership.seat };
    });
  }

  /** A bounded worker maintenance pass, including games with no connected clients.
   * The store completes the request atomically with the terminal journal entry. */
  async process(
    worker: GameWorker,
    onFault: (error: unknown) => void = () => {},
  ): Promise<string[]> {
    const requests = await this
      .sql`SELECT e.*, g.versions, l.versions AS lobby_versions FROM play.match_exits e
      JOIN play.games g ON g.id = e.game_id JOIN play.lobbies l ON l.game_id = g.id WHERE e.status = 'pending'
      AND (g.owner_id IS NULL OR g.lease_until <= clock_timestamp() OR g.owner_id = ${worker.ownerId})
      ORDER BY e.created_at LIMIT 16`;
    const changed: string[] = [];
    for (const request of requests) {
      try {
        if (
          !isDeepStrictEqual(request.versions, request.lobby_versions) ||
          !(await loadGameVersions(this.sql, request.versions)) ||
          !(await loadGameVersions(this.sql, request.lobby_versions))
        ) {
          await this.sql.begin(async tx => {
            await tx`SELECT id FROM play.matches WHERE id = ${request.match_id} FOR UPDATE`;
            await tx`SELECT id FROM play.games WHERE id = ${request.game_id} FOR UPDATE`;
            const closed =
              await tx`UPDATE play.match_exits SET status = 'abandoned', closed_at = clock_timestamp()
            WHERE match_id = ${request.match_id} AND status = 'pending' RETURNING match_id`;
            if (!closed.length) return;
            await tx`UPDATE play.games SET status = 'abandoned', owner_id = NULL, lease_until = NULL,
            fence = fence + 1, ended_at = clock_timestamp(), updated_at = clock_timestamp()
            WHERE id = ${request.game_id} AND status = 'running'`;
            await tx`UPDATE play.undo_requests SET status = 'expired' WHERE game_id = ${request.game_id} AND status = 'pending'`;
            await refreshMatchStatistics(tx, request.match_id);
            await notifyGame(tx, request.game_id);
          });
          continue;
        }
        const binding = await worker.acquire(request.game_id);
        try {
          await binding.run(async host => {
            // Stable receipt hash survives a crash between commit and acknowledgement.
            await host.submitProjected(
              request.seat,
              request.request_id,
              stateDigest(JSON.stringify(request.request_id)),
              state => ({
                type: 'concede',
                gameId: state.gameId,
                playerId: request.seat,
                expectedRevision: state.revision,
              }),
              {
                check: async () => true, // The API already authenticated this durable request.
                commit: async tx =>
                  !!(
                    await tx`SELECT match_id FROM play.match_exits
              WHERE game_id = ${request.game_id} AND request_id = ${request.request_id}
                AND seat = ${request.seat} AND status = 'pending'`
                  ).length,
              },
            );
          });
          changed.push(request.game_id);
        } finally {
          binding.release();
        }
      } catch (error) {
        onFault(error);
      }
    }
    return changed;
  }
}
