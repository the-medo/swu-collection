import * as Sentry from '@sentry/bun';

export const CRON_SENTRY_MONITOR_SLUGS = {
  'fetch-cardmarket-pricing': 'cron-fetch-and-pair-cardmarket-pricing',
  'fetch-tcgplayer-pricing': 'cron-fetch-and-pair-tcgplayer-pricing',
  'cleanup-card-stats': 'cron-cleanup-card-stats',
  'update-card-standard-variants': 'update-card-standard-variants',
  'compute-deck-pricing': 'compute-deck-pricing',
  'compute-collection-pricing': 'compute-collection-pricing',
  'live-tournament-reconcile': 'cron-live-tournament-reconcile',
  'live-tournament-check': 'cron-live-tournament-check',
  'tournament-import-queue': 'cron-tournament-import-queue',
};

Sentry.init({
  environment: process.env.ENVIRONMENT,
  dsn: process.env.SENTRY_BACKEND_DSN,
});
