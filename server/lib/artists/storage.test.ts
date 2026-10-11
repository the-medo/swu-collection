import { expect, test } from 'bun:test';
import { createArtistSnapshotStorage } from './storage';
import { artistExportChecksum } from './transfer';
import { MAX_ARTIST_EXPORT_BYTES } from '../../../shared/types/artistTransfer';

test('R2 snapshots roundtrip, paginate, verify integrity and refuse overwrites', async () => {
  const key = 'artist-profiles/a-new.json';
  const payload = Buffer.from('{"fixture":true}');
  let stored: Uint8Array | undefined;
  let sha256 = '';
  let oversized = false;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.searchParams.has('list-type')) {
        expect(url.searchParams.get('prefix')).toBe('artist-profiles/');
        expect(url.searchParams.get('max-keys')).toBe('1000');
        const second = url.searchParams.get('continuation-token') === 'next';
        const rows = second
          ? [{ key, date: '2026-10-11T00:00:00Z' }]
          : Array.from({ length: 1000 }, (_, i) => ({
              key: `artist-profiles/old-${i}.json`,
              date: '2026-01-01T00:00:00Z',
            }));
        const contents = rows
          .map(
            row =>
              `<Contents><Key>${row.key}</Key><LastModified>${row.date}</LastModified><Size>${payload.length}</Size></Contents>`,
          )
          .join('');
        return new Response(
          `<ListBucketResult><IsTruncated>${!second}</IsTruncated>${second ? '' : '<NextContinuationToken>next</NextContinuationToken>'}${contents}<Contents><Key>private/other.json</Key><LastModified>2026-10-11T00:00:00Z</LastModified></Contents></ListBucketResult>`,
          { headers: { 'content-type': 'application/xml' } },
        );
      }
      if (url.pathname !== `/test-bucket/${key}`)
        return new Response('<Error><Code>NoSuchKey</Code></Error>', { status: 404 });
      if (request.method === 'PUT') {
        expect(request.headers.get('if-none-match')).toBe('*');
        if (stored)
          return new Response('<Error><Code>PreconditionFailed</Code></Error>', { status: 412 });
        stored = new Uint8Array(await request.arrayBuffer());
        sha256 = request.headers.get('x-amz-meta-sha256')!;
        return new Response(null, { headers: { ETag: '"test"' } });
      }
      if (!stored) return new Response('<Error><Code>NoSuchKey</Code></Error>', { status: 404 });
      return new Response(
        request.method === 'HEAD'
          ? null
          : oversized
            ? new Uint8Array(MAX_ARTIST_EXPORT_BYTES + 1)
            : stored,
        {
          headers: {
            'content-length': String(oversized ? MAX_ARTIST_EXPORT_BYTES + 1 : stored.byteLength),
            'x-amz-meta-sha256': sha256,
          },
        },
      );
    },
  });
  const storage = createArtistSnapshotStorage({
    ARTIST_EXPORT_BUCKET: 'test-bucket',
    R2_ENDPOINT: `http://127.0.0.1:${server.port}`,
    R2_ACCESS_KEY_ID: 'fixture',
    R2_SECRET_ACCESS_KEY: 'fixture',
  });
  try {
    expect(storage.status()).toEqual({ configured: true, bucket: 'test-bucket' });
    const first = await storage.list();
    expect(first.snapshots).toHaveLength(1001);
    expect(first.snapshots[0].key).toBe(key);
    expect(first.snapshots.every(item => item.key.startsWith('artist-profiles/'))).toBe(true);
    await storage.put(key, payload);
    expect(sha256).toBe(artistExportChecksum(payload));
    expect((await storage.get(key)).bytes).toEqual(payload);
    await expect(storage.put(key, Buffer.from('changed'))).rejects.toThrow();
    expect((await storage.get(key)).bytes).toEqual(payload);
    sha256 = '0'.repeat(64);
    await expect(storage.get(key)).rejects.toThrow('checksum');
    oversized = true;
    await expect(storage.get(key)).rejects.toThrow('oversized');
    await expect(storage.get('artist-profiles/missing.json')).rejects.toThrow(
      'no longer available',
    );
    expect(() => storage.get('private/other.json')).toThrow();
    expect(() => storage.get('artist-profiles/../other.json')).toThrow();
    expect(() => storage.put(key, new Uint8Array(MAX_ARTIST_EXPORT_BYTES + 1))).toThrow('10 MiB');
  } finally {
    server.stop(true);
  }
});

test('missing R2 configuration is explicit and makes no network request', async () => {
  const storage = createArtistSnapshotStorage({});
  expect(storage.status()).toEqual({ configured: false, bucket: null });
  await expect(storage.list()).rejects.toMatchObject({ status: 503 });
});
