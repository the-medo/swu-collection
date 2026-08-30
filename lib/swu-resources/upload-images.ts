import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

if (!r2Endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error(
    'R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required to upload images.',
  );
}

// Initialize the S3 client
const s3Client = new S3Client({
  region: 'auto', // R2 does not require a specific region
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const webpImagePath = './lib/swu-resources/output/images/webp'; // Path to your local images folder
const maxConcurrentUploads = 20;

async function uploadImage(filePath: string, key: string) {
  const fileData = await fs.readFile(filePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileData,
    ContentType: 'image/webp',
  });

  try {
    await s3Client.send(command);
    console.log(`Uploaded: ${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to upload ${key}:`, error);
    return false;
  }
}

async function uploadAllImages() {
  const files = await fs.readdir(webpImagePath);
  let failedUploads = 0;

  // Process files in parallel with a concurrency limit
  const uploadPromises: Array<Promise<boolean>> = [];
  for (const file of files) {
    const fullPath = path.join(webpImagePath, file);
    const stats = await fs.stat(fullPath);

    if (stats.isFile()) {
      const key = `cards/${file}`; // Prefixing with `webp/` in the bucket
      const uploadPromise = uploadImage(fullPath, key);
      uploadPromises.push(uploadPromise);

      // Throttle uploads to avoid overwhelming the network
      if (uploadPromises.length >= maxConcurrentUploads) {
        const results = await Promise.all(uploadPromises); // Wait for current batch to finish
        failedUploads += results.filter(success => !success).length;
        uploadPromises.length = 0; // Reset the array
      }
    }
  }

  // Upload any remaining files
  if (uploadPromises.length > 0) {
    const results = await Promise.all(uploadPromises);
    failedUploads += results.filter(success => !success).length;
  }

  if (failedUploads > 0) {
    throw new Error(`${failedUploads} image upload(s) failed.`);
  }

  console.log(`All ${files.length} images have been uploaded.`);
}

try {
  await uploadAllImages();
} catch (error) {
  console.error('Error uploading images:', error);
  process.exitCode = 1;
}
