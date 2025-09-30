import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price';
import { cardVariantPriceHistory } from '../../db/schema/card_variant_price_history';
import { eq, sql } from 'drizzle-orm';
import { transformPricingObjectToCardMarketPriceData } from './transform-pricing-object';
import type { ParsedPricingObject } from '../../../types/CardPrices';
import type { CardVariantPrice } from '../../db/schema/card_variant_price';

// Initialize the S3 client
const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: 'auto', // R2 does not require a specific region
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

/**
 * Loads the current JSON file from the bucket
 * Current means that its name is the current date (YYYY-MM-DD)
 *
 * @returns The parsed JSON data from the file
 */
async function loadCurrentJsonFile(): Promise<Record<string, ParsedPricingObject>> {
  try {
    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];
    const key = `card-prices/cardmarket/${currentDate}.json`;

    // Get the object from the bucket
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    // Convert the stream to a string
    const bodyContents = await response.Body?.transformToString();

    if (!bodyContents) {
      throw new Error(`No content found in file: ${key}`);
    }

    // Parse the JSON string
    return JSON.parse(bodyContents) as Record<string, ParsedPricingObject>;
  } catch (error) {
    console.error('Error loading current JSON file:', error);
    throw error;
  }
}

/**
 * Pairs CardMarket prices to database records and updates them
 */
export async function pairCardmarketPricesToDatabase(): Promise<void> {
  try {
    console.log('Starting to pair CardMarket prices to database...');

    // 1. Load current JSON file from bucket
    console.log('Loading current JSON file from bucket...');
    const jsonData = await loadCurrentJsonFile();
    console.log(`Loaded JSON data with ${Object.keys(jsonData).length} entries`);

    // 2. Load all cardmarket rows from card_variant_price table
    console.log('Loading cardmarket rows from database...');
    const cardmarketPrices = await db
      .select()
      .from(cardVariantPrice)
      .where(eq(cardVariantPrice.sourceType, 'cardmarket'));
    console.log(`Loaded ${cardmarketPrices.length} cardmarket prices from database`);

    // 3. Pair sourceProductId from database to data from the JSON file
    console.log('Pairing sourceProductId with JSON data...');
    const updatedPrices: CardVariantPrice[] = [];
    const historyEntries = [];
    const currentDate = new Date();

    for (const dbPrice of cardmarketPrices) {
      // Skip if no sourceProductId
      if (!dbPrice.sourceProductId) {
        continue;
      }

      // Find matching data in JSON
      const pricingObject = jsonData[dbPrice.sourceProductId];
      if (!pricingObject) {
        continue;
      }

      // 4. Transform data to our object format
      const transformedData = transformPricingObjectToCardMarketPriceData(pricingObject);
      const stringifiedData = JSON.stringify(transformedData);
      const newPrice = transformedData.fromPrice.toString();

      // 5. Prepare update for card_variant_price
      updatedPrices.push({
        cardId: dbPrice.cardId,
        variantId: dbPrice.variantId,
        sourceType: dbPrice.sourceType,
        sourceLink: dbPrice.sourceLink,
        sourceProductId: dbPrice.sourceProductId,
        updatedAt: currentDate,
        data: stringifiedData,
        price: newPrice,
      });

      // 6. Prepare insert for card_variant_price_history
      historyEntries.push({
        cardId: dbPrice.cardId,
        variantId: dbPrice.variantId,
        sourceType: dbPrice.sourceType,
        createdAt: currentDate,
        data: stringifiedData,
        price: newPrice,
      });
    }

    // Update card_variant_price table using insert with update on conflict
    if (updatedPrices.length > 0) {
      console.log(`Updating ${updatedPrices.length} prices in card_variant_price table...`);

      // Process in batches to avoid potential issues with large updates
      const batchSize = 100;
      for (let i = 0; i < updatedPrices.length; i += batchSize) {
        const batch = updatedPrices.slice(i, i + batchSize);
        await db
          .insert(cardVariantPrice)
          .values(batch)
          .onConflictDoUpdate({
            target: [
              cardVariantPrice.cardId,
              cardVariantPrice.variantId,
              cardVariantPrice.sourceType,
            ],
            set: {
              updatedAt: currentDate,
              data: sql`excluded.data`,
              price: sql`excluded.price`,
            },
          });
      }
    }

    // Insert into card_variant_price_history table
    if (historyEntries.length > 0) {
      console.log(
        `Inserting ${historyEntries.length} entries into card_variant_price_history table...`,
      );

      // Process in batches to avoid potential issues with large inserts
      const batchSize = 100;
      for (let i = 0; i < historyEntries.length; i += batchSize) {
        const batch = historyEntries.slice(i, i + batchSize);
        await db.insert(cardVariantPriceHistory).values(batch);
      }
    }

    console.log('Successfully paired CardMarket prices to database');
  } catch (error) {
    console.error('Error pairing CardMarket prices to database:', error);
    throw error;
  }
}
