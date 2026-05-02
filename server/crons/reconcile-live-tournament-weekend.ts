/**
 * Live Tournament Weekend Reconcile Cron Script
 *
 * Usage:
 *  - bun run server/crons/reconcile-live-tournament-weekend.ts
 */

import * as Sentry from '@sentry/bun';
import { getLiveTournamentWeekendReconciliation } from '../lib/live-tournaments';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';

async function main() {
  console.log('[reconcile-live-tournament-weekend] Starting reconcile...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['live-tournament-reconcile']);
  cron.started();

  try {
    const result = await getLiveTournamentWeekendReconciliation();

    if (!result) {
      console.log('[reconcile-live-tournament-weekend] No live tournament weekend found.');
      cron.finished();
      process.exit(0);
    }

    const { weekend, reconciliation } = result;
    console.log('[reconcile-live-tournament-weekend] Checked weekend:', {
      weekendId: weekend.id,
      name: weekend.name,
      date: weekend.date,
      expected: reconciliation.expectedTournamentIds.length,
      existing: reconciliation.existingTournamentIds.length,
      missing: reconciliation.missingTournamentIds.length,
      extraneous: reconciliation.extraneousTournamentIds.length,
    });

    if (reconciliation.hasMismatch) {
      Sentry.withScope(scope => {
        scope.setContext('liveTournamentWeekend', {
          weekendId: weekend.id,
          name: weekend.name,
          date: weekend.date,
        });
        scope.setContext('reconciliation', {
          missingTournamentIds: reconciliation.missingTournamentIds,
          extraneousTournamentIds: reconciliation.extraneousTournamentIds,
          expectedTournamentIds: reconciliation.expectedTournamentIds,
          existingTournamentIds: reconciliation.existingTournamentIds,
        });
        Sentry.captureMessage('Live tournament weekend membership mismatch', 'warning');
      });
    }

    console.log('[reconcile-live-tournament-weekend] Completed.');
    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('[reconcile-live-tournament-weekend] Error:', error);
    cron.crashed(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[reconcile-live-tournament-weekend] Unhandled error:', error);
  process.exit(1);
});
