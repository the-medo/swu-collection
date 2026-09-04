import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { transformToId } from '../../../lib/swu-resources/lib/transformToId.ts';

const BUCKET_NAME = 'swu-images';
const MAX_WEBP_DIMENSION = 419;

export type StoredPreviewCardImage = { image: string; horizontal: boolean };

export async function storePreviewCardImage(input: {
  bytes: Uint8Array;
  contentType: string;
  filenameBase: string;
  side: 'front' | 'back';
}): Promise<StoredPreviewCardImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(input.contentType)) {
    throw new Error('Invalid image type. Allowed: PNG, JPEG, WebP');
  }

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 image storage is not configured');
  }

  const source = Buffer.from(input.bytes);
  const metadata = await sharp(source).metadata();
  const horizontal = (metadata.width ?? 0) > (metadata.height ?? 0);
  const body = await sharp(source)
    .resize({
      width: MAX_WEBP_DIMENSION,
      height: MAX_WEBP_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  const filename = `${transformToId(input.filenameBase)}-${input.side}-${Date.now()}.webp`;
  const image = `preview/${filename}`;

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `cards/${image}`,
      Body: body,
      ContentType: 'image/webp',
    }),
  );
  return { image, horizontal };
}
