import postgres from 'postgres';
import { defaultAiReplayLimit, retainAiReplays } from '../ai/live/retention.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { publishStatistics } from '../statistics/publish.ts';
import { encodeArchive } from './archive.ts';

// A separate process isolates synchronous engine verification/JSON work from live
// command handling. Each invocation is bounded; pending rows survive its death.
const url = process.env.DATABASE_URL;
if (!url || process.env.CROSSFIRE_FINALIZER_CHILD !== '1')
  throw new Error('Private finalizer entrypoint');
const sql = postgres(url, { max: 2, idle_timeout: 5, connect_timeout: 5, onnotice: () => {} });
try {
  const only = process.argv[2];
  const games = only
    ? await sql`SELECT id, status FROM play.games WHERE (status = 'ended' OR (status = 'finalized' AND statistics_at IS NULL)) AND id = ${only}`
    : await sql`SELECT id, status FROM play.games WHERE status = 'ended' OR (status = 'finalized' AND statistics_at IS NULL) ORDER BY updated_at LIMIT 4`;
  const store = new PostgresGameStore(sql);
  for (const game of games) {
    try {
      const history = await store.readHistory(game.id);
      if (game.status === 'ended') {
        const archive = await encodeArchive(history);
        await store.publishArchive(game.id, archive);
      }
      await publishStatistics(sql, history);
      const [ai] = await sql`SELECT owner_id FROM play.ai_games WHERE game_id=${game.id}`;
      if (ai) await retainAiReplays(sql, ai.owner_id);
    } catch {
      // Keep all source rows, and let other ended games progress before retrying.
      await sql`UPDATE play.games SET updated_at = clock_timestamp() WHERE id = ${game.id} AND status IN ('ended', 'finalized')`;
      console.error('Crossfire finalization deferred; source history retained');
    }
  }
  // Also enforces changed account limits and retries a failed expiry transaction.
  const owners =
    await sql`SELECT a.owner_id FROM play.ai_games a JOIN play.games g ON g.id=a.game_id
      LEFT JOIN play.ai_replay_limits limits ON limits.user_id=a.owner_id
      WHERE a.replay_expired_at IS NULL AND g.status='finalized' AND g.statistics_at IS NOT NULL
      GROUP BY a.owner_id,limits.user_id,limits.replay_limit
      HAVING count(*) > CASE WHEN a.owner_id IS NULL THEN 0
        WHEN limits.user_id IS NOT NULL THEN limits.replay_limit
        ELSE ${defaultAiReplayLimit()}::bigint END
      ORDER BY min(g.ended_at) LIMIT 64`;
  for (const owner of owners) await retainAiReplays(sql, owner.owner_id);
} finally {
  await sql.end({ timeout: 5 });
}
