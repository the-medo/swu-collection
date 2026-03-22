import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';

const MAX_WEBP_DIMENSION = 419;
const webpImagePath = path.resolve('./lib/swu-resources/output/images/webp');

async function getWebpFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getWebpFiles(fullPath);
      }

      return path.extname(entry.name).toLowerCase() === '.webp' ? [fullPath] : [];
    }),
  );

  return nestedFiles.flat();
}

async function resizeImageInPlace(filePath: string): Promise<'resized' | 'skipped'> {
  const originalImage = await fs.readFile(filePath);
  const metadata = await sharp(originalImage).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (Math.max(width, height) <= MAX_WEBP_DIMENSION) {
    console.log(`Skipping ${path.basename(filePath)} (${width}x${height})`);
    return 'skipped';
  }

  const resizedImage = await sharp(originalImage)
    .resize({
      width: MAX_WEBP_DIMENSION,
      height: MAX_WEBP_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  const tempFilePath = path.join(
    path.dirname(filePath),
    `codex-resize-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`,
  );

  await fs.writeFile(tempFilePath, resizedImage);
  await fs.unlink(filePath);
  await fs.rename(tempFilePath, filePath);
  console.log(`Resized ${path.basename(filePath)} (${width}x${height})`);

  return 'resized';
}

async function downscaleExistingWebpImages() {
  try {
    const files = await getWebpFiles(webpImagePath);

    if (files.length === 0) {
      console.log(`No .webp files found in ${webpImagePath}`);
      return;
    }

    let resizedCount = 0;
    let skippedCount = 0;

    for (const filePath of files) {
      const result = await resizeImageInPlace(filePath);

      if (result === 'resized') {
        resizedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(
      `Finished resizing images in ${webpImagePath}. Resized: ${resizedCount}, skipped: ${skippedCount}.`,
    );
  } catch (error) {
    console.error('Error resizing existing .webp images:', error);
  }
}

await downscaleExistingWebpImages();
