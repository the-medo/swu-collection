import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { UserFileError } from './errors.ts';

// User images share the application's existing public image bucket in every environment.
const bucket = 'swu-images';
const publicBaseUrl = 'https://images.swubase.com';

export interface UserFileObjectStorage {
  available(): boolean;
  publicUrl(key: string): string;
  put(key: string, bytes: Uint8Array): Promise<void>;
  remove(key: string): Promise<void>;
}
// Only used for new uploads. Existing objects are always located by their stored keys.
export function userFileObjectKeys(userId: string, id: string) {
  // Keep text user IDs within one literal key segment, including dot-only IDs.
  const owner = encodeURIComponent(userId).replace(/\./g, '%2E');
  return {
    imageKey: `user-files/${owner}/${id}.webp`,
    thumbnailKey: `user-files/${owner}/${id}-thumb.webp`,
  };
}

export function createUserFileStorage(env = process.env): UserFileObjectStorage {
  const available = () => !!(env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
  function client() {
    if (!available()) throw new UserFileError('Image storage is not configured.', 503);
    return new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return {
    available,
    // Reading public images never requires upload credentials or an API request.
    publicUrl: key => `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
    async put(key, bytes) {
      const s3 = client();
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=300',
          }),
          { abortSignal: AbortSignal.timeout(30_000) },
        );
      } catch {
        throw new UserFileError('Could not store the image. Please try again.', 502);
      } finally {
        s3.destroy();
      }
    },
    async remove(key) {
      const s3 = client();
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: AbortSignal.timeout(30_000),
        });
      } catch {
        throw new UserFileError('Could not delete the image. Please try again.', 502);
      } finally {
        s3.destroy();
      }
    },
  };
}
