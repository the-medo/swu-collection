/**
 * Run daily at 00:00 UTC: bun run server/crons/generate-daily-sealed-pool.ts
 * Optional backfill: append YYYY-MM-DD. DAILY_SEALED_SET overrides the latest
 * supported released set (for example, DAILY_SEALED_SET=hmw).
 */
import * as Sentry from '@sentry/bun';
import { generateDailySealedPool } from '../lib/card-pools/daily-sealed.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';

const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['daily-sealed-pool']);
cron.started();
let exitCode = 0;
try {
  if (process.argv.length > 3) throw new Error('Usage: generate-daily-sealed-pool.ts [YYYY-MM-DD]');
  const result = await generateDailySealedPool({
    date: process.argv[2],
    set: process.env.DAILY_SEALED_SET,
  });
  console.log('[daily-sealed-pool]', {
    status: result.created ? 'created' : 'already-exists',
    date: result.pool.dailyDate,
    poolId: result.pool.id,
    set: result.pool.set,
    packs: 8,
  });
  cron.finished();
} catch (error) {
  cron.crashed(error);
  console.error(
    '[daily-sealed-pool] Failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  exitCode = 1;
} finally {
  await Sentry.flush(2000).catch(() => undefined);
}
process.exit(exitCode);
