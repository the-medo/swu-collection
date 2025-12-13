/**
 * TCGplayer Pricing Fetch Cron Script
 *
 * This script fetches the latest pricing data from TCGplayer via tcgcsv.com:
 * 1. Downloads groups list and uploads raw to bucket
 * 2. For each group, downloads prices and uploads raw to bucket
 * 3. Builds a combined parsed map keyed by productId and uploads it
 * 4. Pairs prices to DB rows where sourceType = 'tcgplayer' and writes history
 *
 * Run with: bun fetch-tcgplayer-pricing.ts
 */

import { fetchAndUploadTCGPlayerPricing } from '../lib/card-prices/fetch-and-upload-tcgplayer-prices';
import { pairTCGPlayerPricesToDatabase } from '../lib/card-prices/pair-tcgplayer-prices-to-database.ts';

async function main() {
  console.log('Starting TCGplayer pricing fetch...');

  try {
    await fetchAndUploadTCGPlayerPricing();
    console.log('TCGplayer pricing fetch completed successfully');

    await pairTCGPlayerPricesToDatabase();
    console.log('TCGplayer prices paired to database successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error during TCGplayer pricing fetch:', error);
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
