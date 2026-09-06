/**
 * Karabast Unimplemented Cards Fetch Cron Script
 *
 * Usage:
 *  - bun run server/crons/fetch-karabast-unimplemented.ts
 */

import * as Sentry from '@sentry/bun';
import { fetchKarabastUnimplementedCards } from '../lib/karabast/fetchKarabastUnimplementedCards.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';

async function flushSentry() {
  try {
    await Sentry.flush(2000);
  } catch {
    // no-op
  }
}

async function main() {
  console.log('[fetch-karabast-unimplemented] Starting Karabast unimplemented card fetch...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['fetch-karabast-unimplemented']);
  cron.started();

  try {
    const result = await fetchKarabastUnimplementedCards();

    console.log('[fetch-karabast-unimplemented] Completed.', {
      fetchedRows: result.fetchedRows,
      storedRows: result.storedRows,
      matchedRows: result.matchedRows,
      unmatchedRows: result.unmatchedRows,
      refreshedAt: result.refreshedAt,
    });

    cron.finished();
    await flushSentry();
    process.exit(0);
  } catch (error) {
    console.error('[fetch-karabast-unimplemented] Error:', error);
    cron.crashed(error);
    await flushSentry();
    process.exit(1);
  }
}

main().catch(async error => {
  console.error('[fetch-karabast-unimplemented] Unhandled error:', error);
  await flushSentry();
  process.exit(1);
});
