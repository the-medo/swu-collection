import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { TCGCSV_SWU_ID } from '../../../shared/consts/constants.ts';

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

// Types for TCGplayer responses (simplified)
interface TcgGroupItem {
  groupId: number;
  name: string;
  abbreviation: string;
  isSupplemental: boolean;
  publishedOn: string;
  modifiedOn: string;
  categoryId: number;
}

interface TcgGroupsResponse {
  success: boolean;
  errors: unknown[];
  totalItems?: number;
  results: TcgGroupItem[];
}

interface TcgPriceItem {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName?: string | null;
}

interface TcgPricesResponse {
  success: boolean;
  errors: unknown[];
  results: TcgPriceItem[];
}

// Parsed object we store per productId in the parsed file
export interface TcgParsedPricingObject {
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string | null;
}

type ParsedData = Record<string, TcgParsedPricingObject>;

async function fileExistsInBucket(key: string): Promise<boolean> {
  try {
    const head = new HeadObjectCommand({ Bucket: bucketName, Key: key });
    await s3Client.send(head);
    return true;
  } catch {
    return false;
  }
}

async function uploadToBucket(key: string, data: string, contentType = 'application/json') {
  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: data,
    ContentType: contentType,
  });
  await s3Client.send(cmd);
  console.log(`Uploaded: ${key}`);
}

async function fetchGroups(): Promise<TcgGroupsResponse> {
  const url = `https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/groups`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch TCGplayer groups: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TcgGroupsResponse;
}

async function fetchGroupPrices(groupId: number): Promise<TcgPricesResponse> {
  const url = `https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/${groupId}/prices`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch TCGplayer prices for group ${groupId}: ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as TcgPricesResponse;
}

/**
 * Fetches TCGplayer groups and per-group prices, uploads raw files, and uploads a combined parsed file.
 * Parsed file path: card-prices/tcgplayer/YYYY-MM-DD.json
 */
export async function fetchAndUploadTCGPlayerPricing(forceUpload: boolean = false): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const parsedKey = `card-prices/tcgplayer/${date}.json`;

  try {
    // Skip if parsed file already exists and not forcing
    const exists = await fileExistsInBucket(parsedKey);
    if (exists && !forceUpload) {
      console.log(`File ${parsedKey} already exists. Use forceUpload=true to regenerate.`);
      return;
    }

    console.log('Fetching TCGplayer groups...');
    const groupsResp = await fetchGroups();
    const groups = groupsResp.results ?? [];

    // Upload raw groups file
    const rawGroupsKey = `card-prices/tcgplayer/raw/groups/${date}.json`;
    await uploadToBucket(rawGroupsKey, JSON.stringify(groupsResp));

    console.log(`Fetched ${groups.length} groups. Fetching prices per group...`);

    const parsedData: ParsedData = {};

    for (const g of groups) {
      try {
        const pricesResp = await fetchGroupPrices(g.groupId);
        // Upload per-group raw file
        const rawGroupPricesKey = `card-prices/tcgplayer/raw/${g.groupId}-${date}.json`;
        await uploadToBucket(rawGroupPricesKey, JSON.stringify(pricesResp));

        // Add to parsed map
        for (const item of pricesResp.results || []) {
          const key = String(item.productId);
          parsedData[key] = {
            lowPrice: item.lowPrice ?? null,
            midPrice: item.midPrice ?? null,
            highPrice: item.highPrice ?? null,
            marketPrice: item.marketPrice ?? null,
            directLowPrice: item.directLowPrice ?? null,
            subTypeName: item.subTypeName ?? null,
          };
        }
      } catch (e) {
        console.error(`Failed to fetch/upload prices for group ${g.groupId}`, e);
      }
    }

    // Upload combined parsed file
    await uploadToBucket(parsedKey, JSON.stringify(parsedData));
    console.log('TCGplayer pricing fetch and upload completed.');
  } catch (error) {
    console.error('Error fetching and uploading TCGplayer pricing:', error);
    throw error;
  }
}
