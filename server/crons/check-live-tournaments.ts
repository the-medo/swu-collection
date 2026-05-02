/**
 * Live Tournament Check Cron Script
 *
 * Usage:
 *  - bun run server/crons/check-live-tournaments.ts
 */

import * as Sentry from '@sentry/bun';
import { checkLiveTournamentWeekend } from '../lib/live-tournaments';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';

async function main() {
  console.log('[check-live-tournaments] Starting live tournament checks...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['live-tournament-check']);
  cron.started();

  try {
    const result = await checkLiveTournamentWeekend();

    if (!result) {
      console.log('[check-live-tournaments] No live tournament weekend found.');
      cron.finished();
      process.exit(0);
    }

    console.log('[check-live-tournaments] Checked weekend:', {
      weekendId: result.weekend.id,
      name: result.weekend.name,
      eligibleTournamentCount: result.eligibleTournamentCount,
      checkedTournamentCount: result.results.length,
      failedTournamentCount: result.errors.length,
    });

    for (const error of result.errors) {
      Sentry.withScope(scope => {
        scope.setContext('liveTournamentCheck', {
          weekendId: result.weekend.id,
          tournamentId: error.tournamentId,
          meleeId: error.meleeId,
          status: error.status,
        });
        Sentry.captureException(new Error(error.error.message));
      });
    }

    if (result.errors.length > 0) {
      throw new Error(`${result.errors.length} live tournament check(s) failed.`);
    }

    console.log('[check-live-tournaments] Completed.');
    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('[check-live-tournaments] Error:', error);
    cron.crashed(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[check-live-tournaments] Unhandled error:', error);
  process.exit(1);
});
