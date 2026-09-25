import type { Sql, TransactionSql } from 'postgres';

export function defaultAiReplayLimit(
  env: Record<string, string | undefined> = process.env,
): number | null {
  const raw = env.CROSSFIRE_AI_REPLAY_LIMIT ?? '5';
  if (raw === 'all') return null;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))
    throw new Error('CROSSFIRE_AI_REPLAY_LIMIT must be a nonnegative integer or all');
  return Number(raw);
}
export async function aiReplayLimit(tx: TransactionSql, userId: string): Promise<number | null> {
  const [override] =
    await tx`SELECT replay_limit FROM play.ai_replay_limits WHERE user_id=${userId}`;
  return override ? override.replay_limit : defaultAiReplayLimit();
}

/** Only payloads expire. Summary rows and immutable model provenance survive.
 * Per-account locking makes concurrent finalization obey one total allowance. */
export async function retainAiReplays(sql: Sql, ownerId: string | null): Promise<number> {
  return sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`ai-replays:${ownerId ?? 'deleted'}`},0))`;
    const limit = ownerId === null ? 0 : await aiReplayLimit(tx, ownerId);
    if (limit === null) return 0;
    const rows = await tx`SELECT a.game_id FROM play.ai_games a JOIN play.games g ON g.id=a.game_id
      WHERE a.owner_id IS NOT DISTINCT FROM ${ownerId} AND a.replay_expired_at IS NULL
      AND g.status='finalized' AND g.statistics_at IS NOT NULL
      ORDER BY g.ended_at DESC, a.game_id DESC OFFSET ${limit} FOR UPDATE OF a`;
    const ids = rows.map(r => r.game_id);
    if (!ids.length) return 0;
    await tx`UPDATE play.ai_games SET replay_expired_at=clock_timestamp() WHERE game_id=ANY(${ids})`;
    await tx`DELETE FROM play.bookmarks WHERE game_id=ANY(${ids})`;
    await tx`DELETE FROM play.journal_history WHERE game_id=ANY(${ids})`;
    await tx`DELETE FROM play.journal_live WHERE game_id=ANY(${ids})`;
    await tx`DELETE FROM play.checkpoints WHERE game_id=ANY(${ids})`;
    return ids.length;
  });
}
