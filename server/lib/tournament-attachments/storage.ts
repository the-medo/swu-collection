import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { maxAttachmentBytes } from '../../../types/TournamentAttachment.ts';

export class AttachmentError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 | 413 | 502 | 503,
  ) {
    super(message);
  }
}
const magic = Buffer.from('SWUFILE1');
export function attachmentEncryptionKey(value = process.env.USER_DATA_ENCRYPTION_KEY): Buffer {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw new AttachmentError('File storage is not configured.', 503);
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new AttachmentError('File storage is not configured.', 503);
  return key;
}
export function encryptAttachment(
  body: Uint8Array,
  objectKey: string,
  key = attachmentEncryptionKey(),
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(objectKey));
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptAttachment(
  body: Uint8Array,
  objectKey: string,
  key = attachmentEncryptionKey(),
) {
  const bytes = Buffer.from(body);
  if (bytes.length < 37 || !bytes.subarray(0, 8).equals(magic))
    throw new AttachmentError('Could not read this attachment.', 502);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(8, 20));
    decipher.setAAD(Buffer.from(objectKey));
    decipher.setAuthTag(bytes.subarray(20, 36));
    return Buffer.concat([decipher.update(bytes.subarray(36)), decipher.final()]);
  } catch {
    throw new AttachmentError('Could not read this attachment.', 502);
  }
}
export interface AttachmentStorage {
  available(): boolean;
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}
function client() {
  const {
    R2_ENDPOINT: endpoint,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
  } = process.env;
  if (!endpoint || !accessKeyId || !secretAccessKey)
    throw new AttachmentError('File storage is not configured.', 503);
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
}
// This bucket is public. Only authenticated ciphertext is ever stored in it.
export const attachmentStorage: AttachmentStorage = {
  available() {
    try {
      attachmentEncryptionKey();
      return !!(
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY
      );
    } catch {
      return false;
    }
  },
  async put(key, bytes) {
    const body = encryptAttachment(bytes, key);
    try {
      await client().send(
        new PutObjectCommand({
          Bucket: 'swu-images',
          Key: key,
          Body: body,
          ContentType: 'application/octet-stream',
          CacheControl: 'private, no-store',
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    } catch (error) {
      if (error instanceof AttachmentError) throw error;
      throw new AttachmentError('Could not upload the file. Please try again.', 502);
    }
  },
  async get(key) {
    const encryptionKey = attachmentEncryptionKey();
    try {
      const result = await client().send(new GetObjectCommand({ Bucket: 'swu-images', Key: key }), {
        abortSignal: AbortSignal.timeout(30_000),
      });
      if (!result.Body || !result.ContentLength || result.ContentLength > maxAttachmentBytes + 36)
        throw new AttachmentError('Could not read this attachment.', 502);
      return decryptAttachment(await result.Body.transformToByteArray(), key, encryptionKey);
    } catch (error) {
      if (error instanceof AttachmentError) throw error;
      throw new AttachmentError('Could not download the file. Please try again.', 502);
    }
  },
  async remove(key) {
    try {
      await client().send(new DeleteObjectCommand({ Bucket: 'swu-images', Key: key }), {
        abortSignal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      if (error instanceof AttachmentError) throw error;
      throw new AttachmentError('Could not delete the file. Please try again.', 502);
    }
  },
};

export function attachmentFileType(bytes: Uint8Array, mime: string): string {
  const b = Buffer.from(bytes);
  const valid =
    mime === 'image/png'
      ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === 'image/jpeg'
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : mime === 'image/gif'
          ? ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString())
          : mime === 'image/webp'
            ? b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
            : mime === 'application/pdf' && b.subarray(0, 5).toString() === '%PDF-';
  if (!valid)
    throw new AttachmentError('The file contents do not match a supported image or PDF.', 400);
  return (
    {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    } as Record<string, string>
  )[mime];
}
