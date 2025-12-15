/**
 * Compute Deck Pricing Cron Script
 *
 * This script fetches up to 10 most recent deck IDs that require price
 * recomputation and recomputes their prices into the `entity_price` table.
 *
 * Run with: bun compute-deck-pricing.ts
 */

import { getRecentDecksForPriceRecomputation } from '../lib/entity-prices/getRecentDecksForPriceRecomputation.ts';
import { recomputePricesForDecks } from '../lib/entity-prices/recomputePricesForDecks.ts';
import { SentryCron } from './cron-sentry/sentry-cron.ts';
import { CRON_SENTRY_MONITOR_SLUGS } from './cron-sentry/sentry-init.ts';

async function main() {
  console.log('Starting compute-deck-pricing...');

  const cron = new SentryCron(CRON_SENTRY_MONITOR_SLUGS['compute-deck-pricing']);
  cron.started();

  try {
    const deckIds = await getRecentDecksForPriceRecomputation(250);
    console.log(`Found ${deckIds.length} recent deck(s) for price recomputation.`);

    if (deckIds.length > 0) {
      await recomputePricesForDecks(deckIds);
      console.log(`Recomputed prices for ${deckIds.length} deck(s).`);
    } else {
      console.log('No recent decks to recompute.');
    }

    cron.finished();
    process.exit(0);
  } catch (error) {
    console.error('Error during compute-deck-pricing:', error);
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
