import * as Sentry from '@sentry/bun';

export const CRON_SENTRY_MONITOR_SLUGS = {
  'fetch-cardmarket-pricing': 'cron-fetch-and-pair-cardmarket-pricing',
  'fetch-tcgplayer-pricing': 'cron-fetch-and-pair-tcgplayer-pricing',
  'cleanup-card-stats': 'cron-cleanup-card-stats',
  'update-card-standard-variants': 'update-card-standard-variants',
};

Sentry.init({
  environment: process.env.ENVIRONMENT,
  dsn: process.env.SENTRY_BACKEND_DSN,
});
