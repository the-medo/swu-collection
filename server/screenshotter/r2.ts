import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getScreenshotterConfig } from './config.ts';
import type {
  ScreenshotterConfig,
  ScreenshotterR2Config,
  ScreenshotterUploadInput,
  ScreenshotterUploadResult,
} from './types.ts';

const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

let s3Client: S3Client | null = null;

function assertR2Config(r2: ScreenshotterR2Config): asserts r2 is ScreenshotterR2Config & {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  if (!r2.endpoint || !r2.accessKeyId || !r2.secretAccessKey) {
    throw new Error(
      'Screenshotter R2 upload requires R2 endpoint, access key id, and secret access key.',
    );
  }
}

function getS3Client(r2: ScreenshotterR2Config) {
  assertR2Config(r2);

  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
  }

  return s3Client;
}

function toBuffer(body: ScreenshotterUploadInput['body']) {
  return typeof body === 'string' ? Buffer.from(body) : Buffer.from(body);
}

function toPublicUrl(publicBaseUrl: string, key: string) {
  const normalizedKey = key.replace(/^\/+/, '');
  return `${publicBaseUrl}/${normalizedKey}`;
}

export async function uploadScreenshotToR2(
  input: ScreenshotterUploadInput,
  config: ScreenshotterConfig = getScreenshotterConfig(),
): Promise<ScreenshotterUploadResult> {
  const body = toBuffer(input.body);
  const client = getS3Client(config.r2);

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: input.key,
      Body: body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? DEFAULT_CACHE_CONTROL,
    }),
  );

  return {
    r2Key: input.key,
    url: toPublicUrl(config.r2.publicBaseUrl, input.key),
    contentType: input.contentType,
    byteSize: body.byteLength,
  };
}
