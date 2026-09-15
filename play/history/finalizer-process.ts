import postgres from 'postgres';
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
    } catch {
      // Keep all source rows, and let other ended games progress before retrying.
      await sql`UPDATE play.games SET updated_at = clock_timestamp() WHERE id = ${game.id} AND status IN ('ended', 'finalized')`;
      console.error('Crossfire finalization deferred; source history retained');
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}
