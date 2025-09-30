import sharp from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { cardList } from '../../db/lists.ts';
import { selectDefaultVariant } from '../cards/selectDefaultVariant.ts';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
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

// Default logo URL
const DEFAULT_LOGO_URL = 'https://images.swubase.com/logo-light.svg';
// Logo size (approximate width in pixels)
const LOGO_SIZE = 100;
// Image dimensions
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
// Card image size (default size of horizontal images)
const CARD_WIDTH = 419;
const CARD_HEIGHT = 300;
// Background image URL
const BACKGROUND_IMAGE_URL = 'https://images.swubase.com/decks/deck-thumbnail-bg.png';

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
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
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

  const leaderImageUrl = `https://images.swubase.com/cards/${leaderVariant.image.front}`;
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
    // Download the background image with fallback
    const backgroundBuffer = await safelyFetchImage(BACKGROUND_IMAGE_URL, {
      r: 37,
      g: 37,
      b: 37,
      alpha: 1, // Dark grey fallback
    });

    // Create a base image from the background
    const image = sharp(backgroundBuffer).resize(IMAGE_WIDTH, IMAGE_HEIGHT);

    // Download the leader card front image with fallback
    const leaderImageBuffer = await safelyFetchImage(leaderImageUrl, {
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

      // Resize logo if needed with better SVG handling
      logoBuffer = await sharp(logoBuffer, {
        density: 300, // Higher density for better SVG rendering
      })
        .resize(LOGO_SIZE, LOGO_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .toBuffer();
    } catch (error) {
      console.warn('Could not load logo, continuing without it:', error);
      // Continue without the logo
    }

    // Define spacing between and around cards
    const SPACING = Math.floor((IMAGE_WIDTH - CARD_WIDTH * 2) / 3); // Equal spacing everywhere

    const startX = SPACING; // This ensures equal spacing on left and right
    const centerY = Math.floor((IMAGE_HEIGHT - CARD_HEIGHT) / 2); // This ensures equal spacing on top and bottom

    // Prepare composite array
    const compositeArray: OverlayOptions[] = [
      // Leader card on the left
      {
        input: leaderImageBuffer,
        top: centerY,
        left: startX,
      },
      // Base card on the right (with spacing between)
      {
        input: baseImageBuffer,
        top: centerY,
        left: startX + CARD_WIDTH + SPACING, // Add spacing between cards
      },
    ];

    // Add logo if available
    if (logoBuffer) {
      compositeArray.push({
        input: logoBuffer,
        top: IMAGE_HEIGHT - LOGO_SIZE - 5,
        left: IMAGE_WIDTH - LOGO_SIZE - 5,
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

/**
 * Generates thumbnails for all unique leader/base combinations in decks
 * @param options - Optional parameters
 * @param options.tournament_id - If provided, only generate thumbnails for decks from this tournament
 * @param options.force - Force regeneration of thumbnails even if they already exist (defaults to false)
 * @returns Object containing results and errors
 */
export async function generateDeckThumbnails(options?: {
  tournament_id?: string;
  force?: boolean;
}): Promise<{
  results: { leaderBaseKey: string; thumbnailUrl: string }[];
  errors: { leaderBaseKey: string; error: string }[];
}> {
  const force = options?.force || false;
  const tournament_id = options?.tournament_id;

  let uniqueCombinations;

  if (tournament_id) {
    // If tournament_id is provided, fetch decks from the specific tournament
    console.log(`Fetching decks for tournament: ${tournament_id}`);
    uniqueCombinations = await db
      .select({
        leaderId: deck.leaderCardId1,
        baseId: deck.baseCardId,
      })
      .from(deck)
      .innerJoin(tournamentDeck, eq(deck.id, tournamentDeck.deckId))
      .where(
        and(
          eq(isNotNull(deck.leaderCardId1), true),
          eq(isNotNull(deck.baseCardId), true),
          eq(tournamentDeck.tournamentId, tournament_id),
        ),
      )
      .groupBy(deck.leaderCardId1, deck.baseCardId);
  } else {
    // If no tournament_id, fetch all decks
    console.log('Fetching all decks');
    uniqueCombinations = await db
      .select({
        leaderId: deck.leaderCardId1,
        baseId: deck.baseCardId,
      })
      .from(deck)
      .where(and(eq(isNotNull(deck.leaderCardId1), true), eq(isNotNull(deck.baseCardId), true)))
      .groupBy(deck.leaderCardId1, deck.baseCardId);
  }

  // Generate thumbnails for each unique leader/base combination
  const results = [];
  const errors = [];

  for (const deckItem of uniqueCombinations) {
    if (!deckItem.leaderId || !deckItem.baseId) continue;
    const key = `${deckItem.leaderId}_${deckItem.baseId}`;
    try {
      // Generate thumbnail
      const thumbnailUrl = await generateDeckThumbnail(deckItem.leaderId, deckItem.baseId, {
        forceUpload: force,
      });

      results.push({
        leaderBaseKey: key,
        thumbnailUrl,
      });
    } catch (error) {
      console.error(`Error generating thumbnail for leader/base combination ${key}:`, error);
      errors.push({
        leaderBaseKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { results, errors };
}
