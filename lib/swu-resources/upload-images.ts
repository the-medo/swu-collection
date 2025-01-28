import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  } catch (error) {
    console.error(`Failed to upload ${key}:`, error);
  }
}

async function uploadAllImages() {
  try {
    const files = await fs.readdir(webpImagePath);

    // Process files in parallel with a concurrency limit
    const uploadPromises = [];
    for (const file of files) {
      const fullPath = path.join(webpImagePath, file);
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        const key = `cards/${file}`; // Prefixing with `webp/` in the bucket
        const uploadPromise = uploadImage(fullPath, key);
        uploadPromises.push(uploadPromise);

        // Throttle uploads to avoid overwhelming the network
        if (uploadPromises.length >= maxConcurrentUploads) {
          await Promise.all(uploadPromises); // Wait for current batch to finish
          uploadPromises.length = 0; // Reset the array
        }
      }
    }

    // Upload any remaining files
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    console.log('All images have been uploaded.');
  } catch (error) {
    console.error('Error uploading images:', error);
  }
}

await uploadAllImages();
