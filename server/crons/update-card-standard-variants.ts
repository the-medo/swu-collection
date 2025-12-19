/**
 * Update Card Standard Variants Cron Script
 *
 * This script recomputes and writes the default "Standard" variant for every card
 * into the `card_standard_variant` table with upsert semantics.
 *
 * Run with: bun update-card-standard-variants.ts
 */

import { updateCardStandardVariants } from '../lib/cards/update-card-standard-variants.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';

async function main() {
  console.log('Starting update-card-standard-variants...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['update-card-standard-variants']);
  cron.started();

  try {
    await updateCardStandardVariants();
    console.log('Updated card standard variants successfully');

    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('Error during update-card-standard-variants:', error);
    cron.crashed(error);
    process.exit(1);
  }
}

// Execute the main function
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
