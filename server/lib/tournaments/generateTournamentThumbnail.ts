import sharp, { type OverlayOptions } from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { eq } from 'drizzle-orm';
import { countryList } from '../../db/lists.ts';

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
const IMAGE_WIDTH = 1000; // As specified in the requirements
const IMAGE_HEIGHT = 525; // As specified in the requirements

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
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          channels: 4,
          background: fallbackColor,
        },
      }).toBuffer();
    }

    throw error;
  }
}

/**
 * Generates a thumbnail image for a tournament and uploads it to R2 bucket
 * @param tournamentData - The tournament data object
 * @param options - Optional parameters
 * @param options.logoUrl - Custom logo URL (defaults to SWUBase logo)
 * @param options.forceUpload - Force upload even if the image already exists (defaults to false)
 * @returns The URL of the generated thumbnail
 */
export async function generateTournamentThumbnail(
  tournamentData: {
    id: string;
    type: string;
    name: string;
    date: Date;
    countryCode?: string;
    attendance?: number;
  },
  options?: {
    logoUrl?: string;
    forceUpload?: boolean;
  },
): Promise<string> {
  if (!tournamentData || !tournamentData.id) {
    throw new Error('Tournament data with ID is required');
  }

  const logoUrl = options?.logoUrl || DEFAULT_LOGO_URL;
  const forceUpload = options?.forceUpload || false;

  // Generate the key for the image in the R2 bucket
  const key = `tournament/${tournamentData.id}.webp`;

  // Check if the image already exists in the bucket
  if (!forceUpload) {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const headResponse = await s3Client.send(headCommand);

      // If we get here, the object exists
      console.log(`Tournament thumbnail already exists: ${key}, skipping generation`);
      return `https://images.swubase.com/${key}`;
    } catch (error) {
      // Object doesn't exist or there was an error checking, proceed with generation
      console.log(`Tournament thumbnail doesn't exist or error checking: ${key}, generating...`);
    }
  }

  try {
    // Get the background template based on tournament type
    const backgroundUrl = `https://images.swubase.com/tournament-thumbnails/${tournamentData.type}.png`;

    // Download the background template
    const backgroundBuffer = await safelyFetchImage(backgroundUrl, {
      r: 37,
      g: 37,
      b: 37,
      alpha: 1, // Dark grey fallback
    });

    // Create a base image from the background
    const image = sharp(backgroundBuffer);

    // Prepare text overlays
    const compositeArray: OverlayOptions[] = [];

    // Format the date (e.g., "January 15, 2023")
    const formattedDate = new Date(tournamentData.date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const nameParts = tournamentData.name.split(', ');
    const namePart1 = nameParts[0].length > 40 ? `${nameParts[0].slice(0, 37)}...` : nameParts[0];
    const namePart2_full = nameParts.slice(1).join(', ');
    const namePart2 =
      namePart2_full.length > 45 ? `${namePart2_full.slice(0, 42)}...` : namePart2_full;

    // Add tournament name in big font with line break support
    const nameTextSvg = Buffer.from(`
      <svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="300" font-family="Liberation Sans, Arial" font-weight="bold" fill="white" text-anchor="middle">
          <tspan font-size="40" x="50%" dy="0">${namePart1}</tspan>
          <tspan font-size="32" x="50%" dy="36px">${namePart2.length === 0 ? ' ' : (namePart2 ?? ' ')}</tspan>
          <tspan font-size="28" x="50%" dy="123px">${tournamentData?.attendance ? `${tournamentData.attendance} players` : ' '}</tspan>
          <tspan font-size="28" x="50%" dy="40px">${formattedDate}</tspan>
        </text>
      </svg>
    `);

    compositeArray.push({
      input: nameTextSvg,
    });

    /*// Add country flag if available
    // Extract country code from location or continent
    // This is a simplification - in a real implementation, you might need more sophisticated logic
    // to determine the country code from the location or continent
    const locationParts = tournamentData.countryCode.split(',');
    const countryName = locationParts[locationParts.length - 1].trim();

    // Find country code by name (simple approach)
    let countryCode = null;
    for (const [code, country] of Object.entries(countryList)) {
      if (country.name.toLowerCase() === countryName.toLowerCase()) {
        countryCode = code;
        break;
      }
    }

    // If country code is found, add the flag
    if (countryCode && countryList[countryCode]) {
      const flagUrl = countryList[countryCode].flag;
      if (flagUrl) {
        try {
          const flagBuffer = await safelyFetchImage(flagUrl);

          // Add flag at position x=350, y=450
          compositeArray.push({
            input: flagBuffer,
            gravity: 'northwest',
            top: 450,
            left: 350,
          });
        } catch (error) {
          console.warn(
            `Could not load flag for country ${countryCode}, continuing without it:`,
            error,
          );
        }
      }
    }*/

    // Add SWUBase logo to bottom right corner
    try {
      const logoFetched = await safelyFetchImage(logoUrl);

      // Resize logo if it's too large
      const logoBuffer = await sharp(logoFetched, {
        density: 300, // Higher density for better SVG rendering
      })
        .resize(LOGO_SIZE, LOGO_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .toBuffer();

      compositeArray.push({
        input: logoBuffer,
        top: IMAGE_HEIGHT - LOGO_SIZE - 5,
        left: IMAGE_WIDTH - LOGO_SIZE - 5,
      });
    } catch (error) {
      console.warn('Could not load logo, continuing without it:', error);
    }

    // Composite all elements
    const result = await image.composite(compositeArray).webp({ quality: 80 }).toBuffer();

    // Upload to R2 bucket
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: result,
      ContentType: 'image/webp',
    });

    await s3Client.send(command);
    console.log(`Uploaded tournament thumbnail: ${key}`);

    // Return the URL to the uploaded image
    return `https://images.swubase.com/${key}`;
  } catch (error) {
    console.error('Error generating tournament thumbnail:', error);
    throw error;
  }
}

/**
 * Generates thumbnails for all tournaments or a specific tournament
 * @param options - Optional parameters
 * @param options.tournament_id - If provided, only generate thumbnail for this tournament
 * @param options.force - Force regeneration of thumbnails even if they already exist (defaults to false)
 * @returns Object containing results and errors
 */
export async function generateTournamentThumbnails(options?: {
  tournament_id?: string;
  force?: boolean;
}): Promise<{
  results: { tournamentId: string; thumbnailUrl: string }[];
  errors: { tournamentId: string; error: string }[];
}> {
  const force = options?.force || false;
  const tournament_id = options?.tournament_id;

  let tournaments;

  if (tournament_id) {
    // If tournament_id is provided, fetch only that tournament
    console.log(`Fetching tournament: ${tournament_id}`);
    tournaments = await db
      .select({
        id: tournament.id,
        type: tournament.type,
        name: tournament.name,
        date: tournament.date,
        countryCode: tournament.location,
        attendance: tournament.attendance,
      })
      .from(tournament)
      .where(eq(tournament.id, tournament_id));
  } else {
    // If no tournament_id, fetch all tournaments
    console.log('Fetching all tournaments');
    tournaments = await db
      .select({
        id: tournament.id,
        type: tournament.type,
        name: tournament.name,
        date: tournament.date,
        countryCode: tournament.location,
        attendance: tournament.attendance,
      })
      .from(tournament);
  }

  // Generate thumbnails for each tournament
  const results = [];
  const errors = [];

  for (const tournamentItem of tournaments) {
    try {
      // Generate thumbnail
      const thumbnailUrl = await generateTournamentThumbnail(tournamentItem, {
        forceUpload: force,
      });

      results.push({
        tournamentId: tournamentItem.id,
        thumbnailUrl,
      });
    } catch (error) {
      console.error(`Error generating thumbnail for tournament ${tournamentItem.id}:`, error);
      errors.push({
        tournamentId: tournamentItem.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { results, errors };
}
