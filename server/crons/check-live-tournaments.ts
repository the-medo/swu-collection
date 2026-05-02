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

async function flushSentry() {
  try {
    await Sentry.flush(2000);
  } catch {
    // no-op
  }
}

async function main() {
  console.log('[check-live-tournaments] Starting live tournament checks...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['live-tournament-check']);
  cron.started();

  try {
    const result = await checkLiveTournamentWeekend();

    if (!result) {
      console.log('[check-live-tournaments] No live tournament weekend found.');
      cron.finished();
      await flushSentry();
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
        const sentryError = new Error(error.error.message);
        sentryError.stack = error.error.stack ?? sentryError.stack;
        Sentry.captureException(sentryError);
      });
    }

    if (result.errors.length > 0) {
      throw new Error(`${result.errors.length} live tournament check(s) failed.`);
    }

    console.log('[check-live-tournaments] Completed.');
    cron.finished();
    await flushSentry();
    process.exit(0);
  } catch (error) {
    console.error('[check-live-tournaments] Error:', error);
    cron.crashed(error);
    await flushSentry();
    process.exit(1);
  }
}

main().catch(async error => {
  console.error('[check-live-tournaments] Unhandled error:', error);
  await flushSentry();
  process.exit(1);
});
