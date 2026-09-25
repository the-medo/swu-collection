import { isDeepStrictEqual } from 'node:util';
import { loadGameVersions } from '../../../play/storage/card-bundles.ts';
import { activityBases, activityLeaders } from './activity.ts';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { principalSchema, requireSession } from './lobbies.ts';
import type { Principal } from './lobbies.ts';
import type { CrossfireHistoryGame } from '../../../shared/types/crossfire.ts';
const cursorSchema = z.strictObject({ date: z.iso.datetime(), id: z.uuid() });
export class HistoryRequestError extends Error {
  constructor() {
    super('Invalid Crossfire history cursor');
  }
}

/** Account-owned summaries require no engine reconstruction or private payload. */
export class CrossfireHistory {
  constructor(private readonly sql: Sql) {}
  async list(
    raw: Principal,
    after?: string,
    status?: 'running',
    opponent?: 'human' | 'ai',
  ): Promise<{ data: CrossfireHistoryGame[]; nextCursor: string | null }> {
    const principal = principalSchema.parse(raw);
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (after) {
      try {
        cursor = cursorSchema.parse(JSON.parse(Buffer.from(after, 'base64url').toString('utf8')));
      } catch {
        throw new HistoryRequestError();
      }
    }
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, principal);
      const rows =
        await tx`SELECT l.id, l.game_id, l.created_at, g.status, g.summary, g.ended_at, g.provenance, g.versions, g.mode, ai.deck_label, ai.release_label, ai.release_id, ai.retry_at, ai.replay_expired_at, l.versions AS lobby_versions, l.best_of, e.status AS exit_status, e.seat AS exit_seat,
        ${activityLeaders(tx, principal.userId)} AS leaders,
        ${activityBases(tx, principal.userId)} AS bases,
        own.seat, coalesce(opponent_user.display_name, opponent_user.name, 'Opponent') AS opponent
        FROM play.participants own
        JOIN play.lobbies l ON l.id = own.lobby_id
        JOIN play.games g ON g.id = l.game_id
        LEFT JOIN play.ai_games ai ON ai.game_id=g.id
        LEFT JOIN play.match_games mg ON mg.lobby_id = l.id
        LEFT JOIN play.match_exits e ON e.match_id = mg.match_id
        LEFT JOIN play.participants opponent ON opponent.lobby_id = l.id AND opponent.seat <> own.seat
        LEFT JOIN "user" opponent_user ON opponent_user.id = opponent.user_id
        WHERE own.user_id = ${principal.userId} AND l.status = 'started'
        ${status ? tx`AND g.status = ${status}` : tx``}
        ${opponent ? tx`AND g.mode = ${opponent}` : tx``}
        ${cursor ? tx`AND (l.created_at, l.id) < (${cursor.date}::timestamptz, ${cursor.id})` : tx``}
        ORDER BY l.created_at DESC, l.id DESC LIMIT 26`;
      const page = rows.slice(0, 25),
        last = page[page.length - 1];
      const compatible = new Map<string, boolean>();
      for (const row of page)
        compatible.set(
          row.id,
          isDeepStrictEqual(row.versions, row.lobby_versions) &&
            (await loadGameVersions(tx, row.versions)) &&
            (await loadGameVersions(tx, row.lobby_versions)),
        );
      return {
        data: page.map(row => ({
          lobbyId: row.id,
          gameId: row.game_id,
          status: row.status,
          bestOf: row.best_of,
          compatible: compatible.get(row.id)!,
          exit: row.exit_status ? { status: row.exit_status, seat: row.exit_seat } : null,
          practice: row.provenance?.kind === 'practice',
          mySeat: row.seat,
          opponent: row.mode === 'ai' ? row.deck_label : row.opponent,
          ...(row.mode === 'ai'
            ? {
                ai: {
                  deckLabel: row.deck_label,
                  releaseLabel: row.release_label,
                  releaseId: row.release_id,
                  status: row.retry_at ? ('retrying' as const) : ('ready' as const),
                },
                replayAvailable: !row.replay_expired_at,
              }
            : {}),
          leaders: row.leaders,
          bases: row.bases,
          round: row.summary?.round ?? null,
          result: row.summary?.result ?? null,
          startedAt: row.created_at.toISOString(),
          endedAt: row.ended_at?.toISOString() ?? null,
        })),
        nextCursor:
          rows.length > 25 && last
            ? Buffer.from(
                JSON.stringify({ date: last.created_at.toISOString(), id: last.id }),
              ).toString('base64url')
            : null,
      };
    });
  }
}
