import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SwuSet } from '../../../types/enums.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import type { OverlayOptions } from 'sharp';

// R2 bucket configuration
const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

// Initialize the S3 client
const s3Client = new S3Client({
  region: 'auto', // R2 does not require a specific region
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

// Base image paths
const BASE_IMAGES = [
  'thumbnails/meta_card-stats.webp',
  'thumbnails/meta_decks.webp',
  'thumbnails/meta_matchups.webp',
  'thumbnails/meta_meta.webp',
];

// Logo size (width in pixels)
const LOGO_WIDTH = 300;

/**
 * Safely fetches an image from a URL and returns it as a buffer
 * @param url - The URL to fetch the image from
 * @param fallbackColor - Optional fallback color to use if the image can't be fetched
 * @returns The image buffer or a fallback image
 */
async function safelyFetchImage(
  url: string,
  fallbackColor?: { r: number; g: number; b: number; alpha: number },
) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);

    // If a fallback color is provided, create a simple colored rectangle
    if (fallbackColor) {
      return await sharp({
        create: {
          width: 1000,
          height: 525,
          channels: 4,
          background: fallbackColor,
        },
      }).toBuffer();
    }

    throw error;
  }
}

/**
 * Generates thumbnail images for a set and uploads them to R2 bucket
 * @param set - The SwuSet to generate thumbnails for
 * @returns An array of URLs for the generated thumbnails
 */
export async function generateSetThumbnails(set: SwuSet): Promise<string[]> {
  if (!set || !setInfo[set]) {
    throw new Error(`Invalid set: ${set}`);
  }

  const setCode = setInfo[set].code;
  const setLogoUrl = `https://images.swubase.com/logos/${setCode}.png`;
  const thumbnailUrls: string[] = [];

  try {
    // Download the set logo
    console.log(`Downloading logo for set ${set} from ${setLogoUrl}`);
    const logoBuffer = await safelyFetchImage(setLogoUrl, {
      r: 37,
      g: 37,
      b: 37,
      alpha: 1,
    });

    const resizedLogo = sharp(logoBuffer).resize(LOGO_WIDTH, null, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    });

    // Get the buffer for compositing (this actually performs the resize)
    const resizedLogoBuffer = await resizedLogo.toBuffer();
    const resizedLogoMetadata = await sharp(resizedLogoBuffer).metadata();
    const logoHeight = resizedLogoMetadata.height || 100;

    // Process each base image
    for (const baseImagePath of BASE_IMAGES) {
      // Get the base image name for the output path
      const baseImageName = baseImagePath.split('/').pop()!;

      // Generate the key for the image in the R2 bucket
      const key = `thumbnails/sets/${setCode}/${baseImageName}`;

      // Download the base image
      const baseImageUrl = `https://images.swubase.com/${baseImagePath}`;
      const baseImageBuffer = await safelyFetchImage(baseImageUrl, {
        r: 37,
        g: 37,
        b: 37,
        alpha: 1, // Dark grey fallback
      });

      // Get the dimensions of the base image
      const baseImageMetadata = await sharp(baseImageBuffer).metadata();
      const baseWidth = baseImageMetadata.width || 1000;
      const baseHeight = baseImageMetadata.height || 525;

      // Calculate position to place the logo at the bottom center
      const logoTop = 430 + Math.floor((95 - logoHeight) / 2); //baseHeight - logoHeight;

      const logoLeft = 350; // (baseWidth - LOGO_WIDTH) / 2; // Center horizontally
      console.log(`Logo position for ${set} on ${baseImageName}: top=${logoTop}, left=${logoLeft}`);

      // Composite the logo onto the base image
      const compositeArray: OverlayOptions[] = [
        {
          input: resizedLogoBuffer,
          top: logoTop,
          left: logoLeft,
        },
      ];

      const result = await sharp(baseImageBuffer)
        .composite(compositeArray)
        .webp({ quality: 80 })
        .toBuffer();

      // Upload to R2 bucket
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: result,
        ContentType: 'image/webp',
      });

      await s3Client.send(command);
      console.log(`Uploaded set thumbnail: ${key}`);

      // Add the URL to the results
      thumbnailUrls.push(`https://images.swubase.com/${key}`);
    }

    return thumbnailUrls;
  } catch (error) {
    console.error(`Error generating thumbnails for set ${set}:`, error);
    throw error;
  }
}

/**
 * Generates thumbnails for all sets or a specific set
 * @param options - Optional parameters
 * @param options.set - If provided, only generate thumbnails for this set
 * @returns Object containing results and errors
 */
export async function generateAllSetThumbnails(options?: { set?: SwuSet }): Promise<{
  results: { set: SwuSet; thumbnailUrls: string[] }[];
  errors: { set: SwuSet; error: string }[];
}> {
  const specificSet = options?.set;

  // Determine which sets to process
  const setsToProcess: SwuSet[] = specificSet ? [specificSet] : Object.values(SwuSet);

  // Generate thumbnails for each set
  const results = [];
  const errors = [];

  for (const set of setsToProcess) {
    try {
      // Generate thumbnails
      const thumbnailUrls = await generateSetThumbnails(set);

      results.push({
        set,
        thumbnailUrls,
      });
    } catch (error) {
      console.error(`Error generating thumbnails for set ${set}:`, error);
      errors.push({
        set,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { results, errors };
}
