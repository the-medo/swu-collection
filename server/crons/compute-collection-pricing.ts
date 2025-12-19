/**
 * Compute Collection Pricing Cron Script
 *
 * This script fetches up to 25 most recent collection IDs that require price
 * recomputation and recomputes their prices into the `entity_price` table.
 *
 * Run with: bun compute-collection-pricing.ts
 */

import { getRecentCollectionsForPriceRecomputation } from '../lib/entity-prices/getRecentCollectionsForPriceRecomputation.ts';
import { recomputePricesForCollections } from '../lib/entity-prices/recomputePricesForCollections.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';

async function main() {
  console.log('Starting compute-collection-pricing...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['compute-collection-pricing']);
  cron.started();

  try {
    const collectionIds = await getRecentCollectionsForPriceRecomputation(25);
    console.log(`Found ${collectionIds.length} recent collection(s) for price recomputation.`);

    if (collectionIds.length > 0) {
      await recomputePricesForCollections(collectionIds);
      console.log(`Recomputed prices for ${collectionIds.length} collection(s).`);
    } else {
      console.log('No recent collections to recompute.');
    }

    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('Error during compute-collection-pricing:', error);
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
