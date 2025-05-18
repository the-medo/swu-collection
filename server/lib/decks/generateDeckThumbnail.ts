import * as path from 'path';
import sharp, { type OverlayOptions } from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { cardList } from '../../db/lists.ts';
import { selectDefaultVariant } from '../cards/selectDefaultVariant.ts';

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

// Default logo URL
const DEFAULT_LOGO_URL = 'https://images.swubase.com/discord-logo.png';
// Logo size (approximate width in pixels)
const LOGO_SIZE = 55;
const IMAGE_SIZE = 419;

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
          width: 300,
          height: IMAGE_SIZE,
          channels: 4,
          background: fallbackColor,
        },
      }).toBuffer();
    }

    throw error;
  }
}

/**
 * Generates a thumbnail image for a deck and uploads it to R2 bucket
 * @param leaderId - The ID of the leader card
 * @param baseId - The ID of the base card
 * @param options - Optional parameters
 * @param options.logoUrl - Custom logo URL (defaults to SWUBase logo)
 * @param options.backgroundColor - Custom background color (defaults to dark grey)
 * @param options.forceUpload - Force upload even if the image already exists (defaults to false)
 * @returns The URL of the generated thumbnail
 */
export async function generateDeckThumbnail(
  leaderId: string,
  baseId: string,
  options?: {
    logoUrl?: string;
    backgroundColor?: { r: number; g: number; b: number; alpha: number };
    forceUpload?: boolean;
  },
): Promise<string> {
  if (!leaderId || !baseId) {
    throw new Error('Leader ID and Base ID are required');
  }

  // Get the leader and base cards from cardList
  const leaderCard = cardList[leaderId];
  const baseCard = cardList[baseId];

  if (!leaderCard || !baseCard) {
    throw new Error(`Leader card or base card not found in card list: ${leaderId}, ${baseId}`);
  }

  // Get the default variant for each card
  const leaderVariantId = selectDefaultVariant(leaderCard);
  const baseVariantId = selectDefaultVariant(baseCard);

  if (!leaderVariantId || !baseVariantId) {
    throw new Error(`No variant found for leader or base card: ${leaderId}, ${baseId}`);
  }

  // Get the image URLs from the variants
  const leaderVariant = leaderCard.variants[leaderVariantId];
  const baseVariant = baseCard.variants[baseVariantId];

  if (!leaderVariant || !baseVariant) {
    throw new Error(
      `Variant not found for leader or base card: ${leaderVariantId}, ${baseVariantId}`,
    );
  }

  const leaderBackImageUrl = `https://images.swubase.com/cards/${leaderVariant.image.back}`;
  const baseImageUrl = `https://images.swubase.com/cards/${baseVariant.image.front}`;

  const backgroundColor = options?.backgroundColor || { r: 37, g: 37, b: 37, alpha: 1 }; // #252525
  const logoUrl = options?.logoUrl || DEFAULT_LOGO_URL;
  const forceUpload = options?.forceUpload || false;

  // Generate the key for the image in the R2 bucket
  const key = `decks/${leaderId}_${baseId}.webp`;

  // Check if the image already exists in the bucket
  if (!forceUpload) {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const headResponse = await s3Client.send(headCommand);

      // If we get here, the object exists
      console.log(`Deck thumbnail already exists: ${key}, skipping generation`);
      return `https://images.swubase.com/${key}`;
    } catch (error) {
      // Object doesn't exist or there was an error checking, proceed with generation
      console.log(`Deck thumbnail doesn't exist or error checking: ${key}, generating...`);
    }
  }

  try {
    // Create a 419x419px image with dark grey background
    const image = sharp({
      create: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        channels: 4,
        background: backgroundColor,
      },
    });

    // Download the leader card back image with fallback
    const leaderBackImageBuffer = await safelyFetchImage(leaderBackImageUrl, {
      r: 30,
      g: 30,
      b: 30,
      alpha: 1,
    });

    // Download the base card image with fallback
    const baseImageBuffer = await safelyFetchImage(baseImageUrl, { r: 70, g: 70, b: 70, alpha: 1 });

    // Download the swubase logo with fallback (no fallback color as it's optional)
    let logoBuffer: Buffer | null = null;
    try {
      logoBuffer = await safelyFetchImage(logoUrl);

      // Resize logo if it's too large
      const logoMetadata = await sharp(logoBuffer).metadata();
      if (logoMetadata.width && logoMetadata.width > LOGO_SIZE * 2) {
        logoBuffer = await sharp(logoBuffer).resize(LOGO_SIZE, null, { fit: 'contain' }).toBuffer();
      }
    } catch (error) {
      console.warn('Could not load logo, continuing without it:', error);
      // Continue without the logo
    }

    // Resize the base card to 300px width
    const resizedBaseImage = await sharp(baseImageBuffer)
      .resize(300, null, { fit: 'contain' })
      .toBuffer();

    // Prepare composite array
    const compositeArray: OverlayOptions[] = [
      // Leader card in the middle (300x419)
      {
        input: leaderBackImageBuffer,
        gravity: 'center',
      },
      // Base card at the bottom middle (overlapping the bottom half of the leader card)
      {
        input: resizedBaseImage,
        gravity: 'south',
        top: 209, // Position at the bottom half of the image (419/2)
        left: Math.floor((IMAGE_SIZE - 300) / 2) + 1, // Center horizontally
      },
    ];

    // Add logo if available
    if (logoBuffer) {
      compositeArray.push({
        input: logoBuffer,
        gravity: 'southeast',
        top: IMAGE_SIZE - LOGO_SIZE,
        left: IMAGE_SIZE - LOGO_SIZE,
      });
    }

    // Composite the images
    const result = await image.composite(compositeArray).webp({ quality: 80 }).toBuffer();

    // Upload to R2 bucket
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: result,
      ContentType: 'image/webp',
    });

    await s3Client.send(command);
    console.log(`Uploaded deck thumbnail: ${key}`);

    // Return the URL to the uploaded image
    return `https://images.swubase.com/${key}`;
  } catch (error) {
    console.error('Error generating deck thumbnail:', error);
    throw error;
  }
}
