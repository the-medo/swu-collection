import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync, gunzipSync } from 'node:zlib';
import { canonicalJson, type CardCatalog } from '../cards/catalog.ts';
import { validateCatalog } from '../cards/validate.ts';
import { parseVersion } from '../engine/release.ts';
import {
  cardReleaseIndexSchema,
  cardReleaseMetadataSchema,
  type CardReleaseMetadata,
} from '../../shared/types/crossfire-card-releases.ts';

const prefix = 'crossfire/card-bundles';
export const releaseKey = (release: Pick<CardReleaseMetadata, 'version' | 'checksum'>) =>
  `${prefix}/${release.version}/${release.checksum}.json.gz`;
const indexKey = `${prefix}/releases.json`;
export class ReleaseStorageError extends Error {}
export interface ReleaseObjects {
  read(key: string): Promise<{ bytes: Uint8Array; etag: string } | null>;
  write(
    key: string,
    bytes: Uint8Array,
    condition: { etag?: string; create?: boolean },
  ): Promise<void>;
}
export function configuredReleaseObjects(
  env: Record<string, string | undefined> = process.env,
): ReleaseObjects | null {
  const bucket = env.CROSSFIRE_CARD_BUNDLE_BUCKET;
  if (!bucket || !env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY)
    return null;
  const client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  return {
    async read(key) {
      let result;
      try {
        result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode: number } }).$metadata?.httpStatusCode === 404)
          return null;
        throw new ReleaseStorageError('Unable to download card releases from R2');
      }
      if (!result.Body || !result.ETag || (result.ContentLength ?? 0) > 2_000_000)
        throw new ReleaseStorageError('Invalid card release object');
      const chunks: Uint8Array[] = [];
      let length = 0;
      for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
        length += chunk.length;
        if (length > 2_000_000) throw new ReleaseStorageError('Card release object is too large');
        chunks.push(chunk);
      }
      return { bytes: Buffer.concat(chunks), etag: result.ETag };
    },
    async write(key, bytes, condition) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: key.endsWith('.gz') ? 'application/gzip' : 'application/json',
          CacheControl: key === indexKey ? 'no-cache' : 'public, max-age=31536000, immutable',
          ...(condition.create ? { IfNoneMatch: '*' } : { IfMatch: condition.etag }),
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    },
  };
}
export async function availableReleases(objects: ReleaseObjects) {
  const object = await objects.read(indexKey);
  if (!object) return { releases: [] as CardReleaseMetadata[], etag: undefined };
  return {
    ...cardReleaseIndexSchema.parse(JSON.parse(Buffer.from(object.bytes).toString('utf8'))),
    etag: object.etag,
  };
}
export async function downloadRelease(objects: ReleaseObjects, metadata: CardReleaseMetadata) {
  const checked = cardReleaseMetadataSchema.parse(metadata);
  const object = await objects.read(releaseKey(checked));
  if (!object) throw new ReleaseStorageError('Published card bundle is missing');
  let catalog: CardCatalog;
  try {
    const raw = gunzipSync(object.bytes, { maxOutputLength: 8_000_000 });
    catalog = validateCatalog(JSON.parse(raw.toString('utf8')), checked.checksum);
  } catch {
    throw new ReleaseStorageError('Published card bundle failed definition or checksum validation');
  }
  if (
    catalog.data.version !== checked.version ||
    catalog.data.requiredEngine !== checked.requiredEngine ||
    catalog.data.cards.length !== checked.cards
  )
    throw new ReleaseStorageError('Published card bundle metadata does not match');
  return catalog;
}
async function immutable(objects: ReleaseObjects, key: string, bytes: Uint8Array) {
  try {
    await objects.write(key, bytes, { create: true });
  } catch (error) {
    const existing = await objects.read(key);
    if (!existing || !Buffer.from(existing.bytes).equals(Buffer.from(bytes))) throw error;
  }
}
export async function publishCardRelease(
  objects: ReleaseObjects,
  catalog: CardCatalog,
  raw: CardReleaseMetadata,
) {
  const metadata = cardReleaseMetadataSchema.parse(raw);
  validateCatalog(catalog.data, metadata.checksum);
  if (
    metadata.version !== catalog.data.version ||
    metadata.requiredEngine !== catalog.data.requiredEngine ||
    metadata.cards !== catalog.data.cards.length
  )
    throw new ReleaseStorageError('Publication metadata does not match the bundle');
  const current = await availableReleases(objects);
  const previous = current.releases.filter(r => r.runtimeVersion === metadata.runtimeVersion);
  if (previous.some(r => r.runtimeFingerprint !== metadata.runtimeFingerprint))
    throw new ReleaseStorageError(
      'Runtime code changed without a new engine version; redeployment is required',
    );
  const known = current.releases.find(r => r.version === metadata.version);
  if (
    known &&
    (known.checksum !== metadata.checksum ||
      known.runtimeFingerprint !== metadata.runtimeFingerprint)
  )
    throw new ReleaseStorageError('Published versions cannot be overwritten');
  const stable = known ?? metadata;
  await immutable(objects, releaseKey(stable), gzipSync(canonicalJson(catalog.data), { level: 9 }));
  const manifestKey = `${prefix}/${stable.version}/release.json`;
  const existing = await objects.read(manifestKey);
  let published = stable;
  if (existing) {
    published = cardReleaseMetadataSchema.parse(
      JSON.parse(Buffer.from(existing.bytes).toString('utf8')),
    );
    if (
      published.checksum !== stable.checksum ||
      published.runtimeFingerprint !== stable.runtimeFingerprint
    )
      throw new ReleaseStorageError('Published versions cannot be overwritten');
  } else await immutable(objects, manifestKey, Buffer.from(canonicalJson(stable)));
  for (let attempt = 0; attempt < 5; attempt++) {
    const index = await availableReleases(objects);
    if (
      index.releases.some(
        r =>
          r.runtimeVersion === published.runtimeVersion &&
          r.runtimeFingerprint !== published.runtimeFingerprint,
      )
    )
      throw new ReleaseStorageError(
        'Runtime code changed without a new engine version; redeployment is required',
      );
    const old = index.releases.find(r => r.version === published.version);
    if (old) {
      if (old.checksum !== published.checksum)
        throw new ReleaseStorageError('Published version conflict');
      return old;
    }
    const releases = [...index.releases, published].sort((a, b) => {
      const av = parseVersion(a.version),
        bv = parseVersion(b.version);
      return bv[0] - av[0] || bv[1] - av[1] || bv[2] - av[2];
    });
    try {
      await objects.write(
        indexKey,
        Buffer.from(canonicalJson({ schema: 1, releases })),
        index.etag ? { etag: index.etag } : { create: true },
      );
      return published;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new ReleaseStorageError('Concurrent publication; retry');
}
