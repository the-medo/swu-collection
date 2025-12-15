import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price';
import { cardVariantPriceHistory } from '../../db/schema/card_variant_price_history';
import { eq, sql } from 'drizzle-orm';

// Keep this type local to avoid coupling to fetch module implementation details
interface TcgParsedPricingObject {
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string | null;
}

// Initialize the S3 client
const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

async function loadCurrentTcgParsedFile(): Promise<Record<string, TcgParsedPricingObject>> {
  const currentDate = new Date().toISOString().split('T')[0];
  const key = `card-prices/tcgplayer/${currentDate}.json`;

  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const response = await s3Client.send(command);
  const bodyContents = await response.Body?.transformToString();
  if (!bodyContents) throw new Error(`No content found in file: ${key}`);
  return JSON.parse(bodyContents) as Record<string, TcgParsedPricingObject>;
}

function buildDataObject(p: TcgParsedPricingObject) {
  return {
    lowPrice: p.lowPrice ?? 0,
    midPrice: p.midPrice ?? 0,
    highPrice: p.highPrice ?? 0,
    marketPrice: p.marketPrice ?? 0,
    directLowPrice: p.directLowPrice ?? 0,
    subTypeName: p.subTypeName ?? null,
  };
}

function pickPriceForStorage(p: TcgParsedPricingObject): number {
  // Prefer market price, then mid, then low, then high, then direct low
  return p.marketPrice ?? p.midPrice ?? p.lowPrice ?? p.highPrice ?? p.directLowPrice ?? 0;
}

export async function pairTCGPlayerPricesToDatabase(): Promise<void> {
  try {
    console.log('Starting to pair TCGplayer prices to database...');

    // 1) Load current parsed file from bucket
    console.log('Loading current TCGplayer parsed JSON file...');
    const jsonData = await loadCurrentTcgParsedFile();
    console.log(`Loaded TCGplayer JSON with ${Object.keys(jsonData).length} entries`);

    // 2) Load all tcgplayer rows
    console.log('Loading tcgplayer rows from database...');
    const tcgRows = await db
      .select()
      .from(cardVariantPrice)
      .where(eq(cardVariantPrice.sourceType, 'tcgplayer'));
    console.log(`Loaded ${tcgRows.length} tcgplayer prices from database`);

    const updatedBatch: typeof tcgRows = [] as any;
    const historyBatch: Array<{
      cardId: string;
      variantId: string;
      sourceType: string;
      createdAt: Date;
      data: string;
      price: string;
    }> = [];
    const now = new Date();

    for (const row of tcgRows) {
      if (!row.sourceProductId) continue;
      const pricing = jsonData[row.sourceProductId];
      if (!pricing) continue;

      const dataObj = buildDataObject(pricing);
      const priceValue = pickPriceForStorage(pricing);
      const priceStr = priceValue.toString();

      updatedBatch.push({
        cardId: row.cardId,
        variantId: row.variantId,
        sourceType: row.sourceType,
        sourceLink: row.sourceLink,
        sourceProductId: row.sourceProductId,
        updatedAt: now,
        data: JSON.stringify(dataObj),
        price: priceStr,
      } as any);

      historyBatch.push({
        cardId: row.cardId,
        variantId: row.variantId,
        sourceType: row.sourceType,
        createdAt: now,
        data: JSON.stringify(dataObj),
        price: priceStr,
      });
    }

    if (updatedBatch.length > 0) {
      console.log(`Upserting ${updatedBatch.length} rows into card_variant_price...`);
      const size = 100;
      for (let i = 0; i < updatedBatch.length; i += size) {
        const chunk = updatedBatch.slice(i, i + size);
        await db
          .insert(cardVariantPrice)
          .values(chunk)
          .onConflictDoUpdate({
            target: [
              cardVariantPrice.cardId,
              cardVariantPrice.variantId,
              cardVariantPrice.sourceType,
            ],
            set: {
              updatedAt: now,
              data: sql`excluded.data`,
              price: sql`excluded.price`,
            },
          });
      }
    }

    if (historyBatch.length > 0) {
      console.log(`Inserting ${historyBatch.length} rows into card_variant_price_history...`);
      const size = 100;
      for (let i = 0; i < historyBatch.length; i += size) {
        const chunk = historyBatch.slice(i, i + size);
        await db.insert(cardVariantPriceHistory).values(chunk);
      }
    }

    console.log('Successfully paired TCGplayer prices to database');
  } catch (error) {
    console.error('Error pairing TCGplayer prices to database:', error);
    throw error;
  }
}
