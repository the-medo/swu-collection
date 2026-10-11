import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  artistSnapshotKeySchema,
  MAX_ARTIST_EXPORT_BYTES,
  type ArtistSnapshot,
  type ArtistTransferStatus,
} from '../../../shared/types/artistTransfer.ts';
import { artistExportChecksum } from './transfer.ts';
import { ArtistTransferError } from './errors.ts';

export interface ArtistSnapshotStorage {
  status(): ArtistTransferStatus['storage'];
  list(): Promise<{ snapshots: ArtistSnapshot[] }>;
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<{ bytes: Uint8Array; sha256: string }>;
}

export function createArtistSnapshotStorage(env = process.env): ArtistSnapshotStorage {
  const bucket = env.ARTIST_EXPORT_BUCKET?.trim();
  const configured = !!(
    bucket &&
    env.R2_ENDPOINT &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY
  );
  async function withClient<T>(operation: (client: S3Client, signal: AbortSignal) => Promise<T>) {
    if (!configured)
      throw new ArtistTransferError('Artist snapshot storage is not configured.', 503);
    const client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      maxAttempts: 2,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
    try {
      return await operation(client, AbortSignal.timeout(30_000));
    } catch (error) {
      if (error instanceof ArtistTransferError) throw error;
      if ((error as { name?: string }).name === 'NoSuchKey')
        throw new ArtistTransferError(
          'This snapshot is no longer available. Refresh the list.',
          404,
        );
      throw new ArtistTransferError(
        'Could not access artist snapshots in R2. Check the bucket permissions and try again.',
        502,
      );
    } finally {
      client.destroy();
    }
  }
  return {
    status: () => ({ configured, bucket: bucket ?? null }),
    list: () =>
      withClient(async (client, signal) => {
        const snapshots: ArtistSnapshot[] = [];
        let cursor: string | undefined;
        // S3 orders keys, not upload dates. Read every page before showing newest first.
        do {
          const result = await client.send(
            new ListObjectsV2Command({
              Bucket: bucket,
              Prefix: 'artist-profiles/',
              MaxKeys: 1000,
              ContinuationToken: cursor,
            }),
            { abortSignal: signal },
          );
          for (const object of result.Contents ?? []) {
            if (
              object.Key &&
              artistSnapshotKeySchema.safeParse(object.Key).success &&
              object.LastModified
            ) {
              snapshots.push({
                key: object.Key,
                uploadedAt: object.LastModified.toISOString(),
                bytes: object.Size ?? 0,
              });
            }
          }
          cursor = result.IsTruncated ? result.NextContinuationToken : undefined;
        } while (cursor);
        snapshots.sort(
          (a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.key.localeCompare(a.key),
        );
        return { snapshots };
      }),
    put: (key, bytes) => {
      artistSnapshotKeySchema.parse(key);
      if (bytes.byteLength > MAX_ARTIST_EXPORT_BYTES)
        throw new ArtistTransferError('Artist snapshot exceeds 10 MiB.', 413);
      return withClient(async (client, signal) => {
        const sha256 = artistExportChecksum(bytes);
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: 'application/json',
            IfNoneMatch: '*',
            Metadata: { sha256 },
          }),
          { abortSignal: signal },
        );
        const saved = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: signal,
        });
        if (saved.ContentLength !== bytes.byteLength || saved.Metadata?.sha256 !== sha256)
          throw new ArtistTransferError('The uploaded snapshot could not be verified.', 502);
      });
    },
    get: key => {
      artistSnapshotKeySchema.parse(key);
      return withClient(async (client, signal) => {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: signal,
        });
        if (!object.Body || (object.ContentLength ?? 0) > MAX_ARTIST_EXPORT_BYTES)
          throw new ArtistTransferError('Missing or oversized artist snapshot.', 413);
        const chunks: Uint8Array[] = [];
        let size = 0;
        for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
          size += chunk.byteLength;
          if (size > MAX_ARTIST_EXPORT_BYTES)
            throw new ArtistTransferError('Artist snapshot exceeds 10 MiB.', 413);
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        const sha256 = artistExportChecksum(bytes);
        if (object.Metadata?.sha256 !== sha256)
          throw new ArtistTransferError('Artist snapshot checksum verification failed.', 409);
        return { bytes, sha256 };
      });
    },
  };
}
