import { join } from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import { delay } from './delay.ts';
import { pngImagePath, webpImagePath } from '../raw-data-parser.ts';

export async function downloadAndTransformImage(url: string, filename: string): Promise<void> {
  const pngImageFilename = join(pngImagePath, filename + '.png');
  const webpImageFilename = join(webpImagePath, filename + '.webp');

  if (fs.existsSync(pngImageFilename)) {
    console.log(`Image ${pngImageFilename} already exists, skipping download.`);
    return;
  }

  try {
    await delay(500);

    const myUrl = new URL(url);
    console.log(`Downloading image: ${myUrl}`);

    await mkdir(pngImagePath, { recursive: true });

    const process = await Bun.spawn(['curl', '-sL', myUrl.toString(), '-o', pngImageFilename], {
      stdout: 'pipe', // Optional: Capture stdout if needed
      stderr: 'pipe', // Capture stderr
    });
    const exitCode = await process.exited; // Wait for the process to finish

    if (exitCode !== 0) {
      const errorOutput = process.stderr ? process.stderr.toString() : 'Unknown error';
      console.error('Error downloading image:', errorOutput);
    } else {
      console.log('Image downloaded successfully');
    }

    await mkdir(webpImagePath, { recursive: true });

    console.log(`Image downloaded successfully to ${pngImageFilename}`);
  } catch (error) {
    console.error('Error downloading image:', error);
  }

  try {
    await sharp(pngImageFilename).webp({ quality: 80 }).toFile(webpImageFilename);
    console.log(`Image transformed successfully to ${webpImageFilename}`);
  } catch (error) {
    console.error('Error downloading image:', error);
  }

  return;
}
