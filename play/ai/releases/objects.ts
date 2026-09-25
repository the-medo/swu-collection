import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import {
  aiReleaseIndexSchema,
  aiReleaseSchema,
  type AiRelease,
  type AiSelection,
} from '../../../shared/types/crossfire-ai-releases.ts';
import { canonicalJson } from '../../cards/catalog.ts';

export const AI_PREFIX = 'crossfire/ai';
export const MAX_OBJECT = 32_000_000;
export const sha256 = (data: Uint8Array | string) =>
  createHash('sha256').update(data).digest('hex');
export class AiError extends Error {}
export interface AiObjects {
  read(key: string): Promise<{ bytes: Buffer; etag: string } | null>;
  write(
    key: string,
    bytes: Uint8Array,
    condition: { create?: boolean; etag?: string },
  ): Promise<void>;
  remove(key: string): Promise<void>;
}
const checkKey = (key: string) => {
  if (!key.startsWith(`${AI_PREFIX}/`) || key.includes('..') || !/^[a-zA-Z0-9/_.-]+$/.test(key))
    throw new AiError('Invalid AI object key');
};
export function configuredAiObjects(
  env: Record<string, string | undefined> = process.env,
): AiObjects | null {
  const bucket = env.CROSSFIRE_AI_BUCKET;
  if (!bucket) return null;
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY)
    throw new AiError('AI storage credentials are incomplete');
  const client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  return {
    async read(key) {
      checkKey(key);
      let object;
      try {
        object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: AbortSignal.timeout(30_000),
        });
      } catch (e) {
        if ((e as { $metadata?: { httpStatusCode: number } }).$metadata?.httpStatusCode === 404)
          return null;
        throw new AiError('AI object download failed');
      }
      if (!object.Body || !object.ETag || (object.ContentLength ?? 0) > MAX_OBJECT)
        throw new AiError('Invalid AI object size');
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
        size += chunk.length;
        if (size > MAX_OBJECT) throw new AiError('AI object exceeds size limit');
        chunks.push(chunk);
      }
      return { bytes: Buffer.concat(chunks), etag: object.ETag };
    },
    async write(key, bytes, condition) {
      checkKey(key);
      if (bytes.length > MAX_OBJECT) throw new AiError('AI object exceeds size limit');
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: key.endsWith('.json') ? 'application/json' : 'application/octet-stream',
          CacheControl: 'private, no-store',
          ...(condition.create ? { IfNoneMatch: '*' } : { IfMatch: condition.etag }),
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    },
    async remove(key) {
      checkKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(30_000),
      });
    },
  };
}
export const modelKey = (hash: string) => `${AI_PREFIX}/models/${hash}.pt`;
export const manifestKey = (s: AiSelection) => `${AI_PREFIX}/releases/${s.id}/${s.checksum}.json`;
const indexKey = `${AI_PREFIX}/releases/index.json`;
export async function immutable(objects: AiObjects, key: string, bytes: Buffer) {
  try {
    await objects.write(key, bytes, { create: true });
  } catch (error) {
    const previous = await objects.read(key);
    if (!previous || !previous.bytes.equals(bytes)) throw error;
  }
}
export async function releaseIndex(objects: AiObjects) {
  const object = await objects.read(indexKey);
  return {
    ...aiReleaseIndexSchema.parse(
      object ? JSON.parse(object.bytes.toString()) : { schema: 1, releases: [] },
    ),
    etag: object?.etag,
  };
}
export async function readRelease(objects: AiObjects, selection: AiSelection): Promise<AiRelease> {
  const object = await objects.read(manifestKey(selection));
  if (!object || object.bytes.length > 2_000_000 || sha256(object.bytes) !== selection.checksum)
    throw new AiError('Release manifest failed integrity validation');
  const release = aiReleaseSchema.parse(JSON.parse(object.bytes.toString()));
  if (release.id !== selection.id) throw new AiError('Release identity mismatch');
  return release;
}
export async function readWeights(objects: AiObjects, release: AiRelease) {
  const object = await objects.read(modelKey(release.artifact.sha256));
  if (
    !object ||
    object.bytes.length !== release.artifact.bytes ||
    sha256(object.bytes) !== release.artifact.sha256
  )
    throw new AiError('Model failed integrity validation');
  return object.bytes;
}
export async function publishRelease(objects: AiObjects, raw: unknown, weights: Buffer) {
  const release = aiReleaseSchema.parse(raw);
  if (weights.length !== release.artifact.bytes || sha256(weights) !== release.artifact.sha256)
    throw new AiError('Model failed integrity validation');
  const bytes = Buffer.from(canonicalJson(release));
  if (bytes.length > 2_000_000) throw new AiError('Release manifest is too large');
  const selection = { id: release.id, checksum: sha256(bytes) };
  const existing = (await releaseIndex(objects)).releases.find(r => r.id === release.id);
  if (existing && existing.checksum !== selection.checksum)
    throw new AiError('A release ID cannot be overwritten');
  await immutable(objects, modelKey(release.artifact.sha256), weights);
  await immutable(objects, manifestKey(selection), bytes);
  for (let attempt = 0; attempt < 5; attempt++) {
    const index = await releaseIndex(objects);
    const previous = index.releases.find(r => r.id === selection.id);
    if (previous) {
      if (previous.checksum !== selection.checksum)
        throw new AiError('A release ID cannot be overwritten');
      return selection;
    }
    const next = aiReleaseIndexSchema.parse({
      schema: 1,
      releases: [...index.releases, selection],
    });
    try {
      await objects.write(
        indexKey,
        Buffer.from(canonicalJson(next)),
        index.etag ? { etag: index.etag } : { create: true },
      );
      return selection;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new AiError('Concurrent release publication; retry');
}
