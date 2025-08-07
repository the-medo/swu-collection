import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { CardMarketRawData, ParsedPricingObject } from '../../../types/CardPrices.ts';

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

// URL for the CardMarket pricing guide
const CARDMARKET_PRICING_URL =
  'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_21.json';

// Interface for our parsed data
interface ParsedData {
  [productId: string]: ParsedPricingObject;
}

/**
 * Checks if a file exists in the bucket
 * @param key The key of the file in the bucket
 * @returns True if the file exists, false otherwise
 */
async function fileExistsInBucket(key: string): Promise<boolean> {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(headCommand);
    // If we get here, the object exists
    return true;
  } catch (error) {
    // Object doesn't exist or there was an error checking
    return false;
  }
}

/**
 * Uploads a file to the bucket
 * @param key The key of the file in the bucket
 * @param data The data to upload
 * @param contentType The content type of the file
 */
async function uploadToBucket(
  key: string,
  data: string,
  contentType: string = 'application/json',
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  await s3Client.send(command);
  console.log(`Uploaded: ${key}`);
}

/**
 * Parses raw data from CardMarket into our format
 * @param rawData The raw data from CardMarket
 * @returns A map of parsed objects (productId => object)
 */
function parseCardMarketData(rawData: CardMarketRawData): ParsedData {
  const parsedData: ParsedData = {};

  for (const priceGuide of rawData.priceGuides) {
    const productId = priceGuide.idProduct.toString();
    parsedData[productId] =
      priceGuide.avg || priceGuide.trend || priceGuide.avg1 || priceGuide.avg7 || priceGuide.avg30 //low is missed on purpose from this condition
        ? {
            avg: priceGuide.avg,
            low: priceGuide.low,
            trend: priceGuide.trend,
            avg1: priceGuide.avg1,
            avg7: priceGuide.avg7,
            avg30: priceGuide.avg30,
          }
        : {
            avg: priceGuide['avg-foil'],
            low: priceGuide['low-foil'],
            trend: priceGuide['trend-foil'],
            avg1: priceGuide['avg1-foil'],
            avg7: priceGuide['avg7-foil'],
            avg30: priceGuide['avg30-foil'],
          };
  }

  return parsedData;
}

/**
 * Fetches and uploads CardMarket pricing guide
 * @param forceUpload If true, will upload the file even if it already exists
 */
export async function fetchAndUploadCardMarketPricingGuide(
  forceUpload: boolean = false,
): Promise<void> {
  try {
    // 1. Fetch the file and load it to memory
    console.log('Fetching CardMarket pricing guide...');
    const response = await fetch(CARDMARKET_PRICING_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CardMarket pricing guide: ${response.status} ${response.statusText}`,
      );
    }

    const rawData = (await response.json()) as CardMarketRawData;

    // 2. Parse the date from "createdAt" field (only DATE, not time)
    const createdAt = new Date(rawData.createdAt);
    const date = createdAt.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // 3. Create filename for our bucket
    const rawFilename = `card-prices/cardmarket/raw/${date}.json`;

    // 4. Check if the file exists in the bucket
    const fileExists = await fileExistsInBucket(rawFilename);

    if (!fileExists || forceUpload) {
      // 4a. Upload the raw file
      console.log(`Uploading raw file to ${rawFilename}...`);
      await uploadToBucket(rawFilename, JSON.stringify(rawData));

      // 5. Parse raw data into our format
      console.log('Parsing raw data...');
      const parsedData = parseCardMarketData(rawData);

      // 6. Upload parsed data
      const parsedFilename = `card-prices/cardmarket/${date}.json`;
      console.log(`Uploading parsed data to ${parsedFilename}...`);
      await uploadToBucket(parsedFilename, JSON.stringify(parsedData));

      console.log('CardMarket pricing guide uploaded and parsed successfully.');
    } else {
      // 4b. File exists and forceUpload is false
      console.log(
        `File ${rawFilename} already exists in the bucket. Use forceUpload=true to upload anyway.`,
      );
    }
  } catch (error) {
    console.error('Error fetching and uploading CardMarket pricing guide:', error);
    throw error;
  }
}
