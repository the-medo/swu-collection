/**
 * CardMarket Pricing Guide Fetch Cron Script
 *
 * This script fetches the latest pricing data from CardMarket:
 * 1. Downloads the pricing guide JSON file from CardMarket
 * 2. Uploads the raw data to our bucket
 * 3. Parses the data into our format and uploads it
 *
 * Run with: bun fetch-cardmarket-pricing.ts
 */

import { fetchAndUploadCardMarketPricingGuide } from '../lib/card-prices/fetch-and-upload-cardmarket-pricing-guide';

async function main() {
  console.log('Starting CardMarket pricing guide fetch...');

  try {
    // Call the function to fetch and upload CardMarket pricing guide
    // By default, forceUpload is false, so it will only upload if the file doesn't exist
    await fetchAndUploadCardMarketPricingGuide();

    console.log('CardMarket pricing guide fetch completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during CardMarket pricing guide fetch:', error);
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