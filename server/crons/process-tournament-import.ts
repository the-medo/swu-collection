/**
 * Tournament Import Queue Cron Script
 *
 * Usage:
 *  - bun run server/crons/process-tournament-import.ts
 */

import * as Sentry from '@sentry/bun';
import { processNextTournamentImport } from '../lib/live-tournaments';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';

async function main() {
  console.log('[process-tournament-import] Starting import queue worker...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['tournament-import-queue']);
  cron.started();

  try {
    const result = await processNextTournamentImport();

    if (result.type === 'skipped') {
      console.log('[process-tournament-import] Skipped:', result.reason);
      cron.finished();
      process.exit(0);
    }

    console.log('[process-tournament-import] Processed tournament import:', result);

    if (result.thumbnailErrors > 0) {
      Sentry.withScope(scope => {
        scope.setContext('tournamentImport', result);
        Sentry.captureMessage('Tournament import finished with thumbnail errors', 'warning');
      });
    }

    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('[process-tournament-import] Error:', error);
    cron.crashed(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[process-tournament-import] Unhandled error:', error);
  process.exit(1);
});
