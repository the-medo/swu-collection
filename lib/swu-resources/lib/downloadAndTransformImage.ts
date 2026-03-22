import { join } from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import { delay } from './delay.ts';
import { pngImagePath, webpImagePath } from '../raw-data-parser.ts';

const MAX_WEBP_DIMENSION = 419;

export async function downloadAndTransformImage(
  url: string,
  filename: string,
): Promise<{ horizontal?: boolean }> {
  const pngImageFilename = join(pngImagePath, filename + '.png');
  const webpImageFilename = join(webpImagePath, filename + '.webp');
  let horizontal = false;

  try {
    if (fs.existsSync(pngImageFilename)) {
      console.log(`Image ${pngImageFilename} already exists, skipping download.`);
    } else {
      await delay(500);

      const myUrl = new URL(url);
      console.log(`Downloading image: ${myUrl}`);

      await mkdir(pngImagePath, { recursive: true });

      const process = await Bun.spawn(['curl', '-sL', myUrl.toString(), '-o', pngImageFilename], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const exitCode = await process.exited;

      if (exitCode !== 0) {
        const errorOutput = process.stderr
          ? ((await new Response(process.stderr).text()).trim() || 'Unknown error')
          : 'Unknown error';
        console.error('Error downloading image:', errorOutput);
        return { horizontal };
      }

      console.log(`Image downloaded successfully to ${pngImageFilename}`);
    }
    const metadata = await sharp(pngImageFilename).metadata();
    horizontal = (metadata.width || 0) > (metadata.height || 0);

    await mkdir(webpImagePath, { recursive: true });

    await sharp(pngImageFilename)
      .resize({
        width: MAX_WEBP_DIMENSION,
        height: MAX_WEBP_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(webpImageFilename);

    console.log(`Image transformed successfully to ${webpImageFilename}`);
  } catch (error) {
    console.error('Error downloading and transforming image:', error);
  }

  return { horizontal };
}
