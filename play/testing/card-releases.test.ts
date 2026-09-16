import { expect, test } from 'bun:test';
import { gzipSync } from 'node:zlib';
import { bundledCatalog, CardCatalog } from '../cards/catalog.ts';
import {
  availableReleases,
  downloadRelease,
  publishCardRelease,
  releaseKey,
  type ReleaseObjects,
} from '../releases/storage.ts';
import type { CardReleaseMetadata } from '../../shared/types/crossfire-card-releases.ts';
class MemoryObjects implements ReleaseObjects {
  files = new Map<string, { bytes: Uint8Array; etag: string }>();
  counter = 0;
  async read(key: string) {
    return this.files.get(key) ?? null;
  }
  async write(key: string, bytes: Uint8Array, condition: { etag?: string; create?: boolean }) {
    const previous = this.files.get(key);
    if (condition.create ? !!previous : previous?.etag !== condition.etag)
      throw new Error('Precondition failed');
    this.files.set(key, { bytes, etag: String(++this.counter) });
  }
}
function release(version: string) {
  const data = structuredClone(bundledCatalog.data);
  data.version = version;
  const catalog = new CardCatalog(data);
  const metadata: CardReleaseMetadata = {
    version,
    checksum: catalog.hash,
    requiredEngine: '1.1.0',
    runtimeVersion: '1.1.0',
    runtimeFingerprint: 'a'.repeat(64),
    sourceCommit: 'b'.repeat(40),
    publishedAt: '2026-09-15T12:00:00.000Z',
    cards: data.cards.length,
  };
  return { catalog, metadata };
}
test('publication and download are idempotent and content addressed', async () => {
  const storage = new MemoryObjects(),
    r = release('1.1.901');
  await publishCardRelease(storage, r.catalog, r.metadata);
  await publishCardRelease(storage, r.catalog, {
    ...r.metadata,
    publishedAt: '2026-09-15T13:00:00.000Z',
  });
  expect((await availableReleases(storage)).releases).toHaveLength(1);
  expect((await downloadRelease(storage, r.metadata)).hash).toBe(r.catalog.hash);
  const altered = structuredClone(r.catalog.data);
  altered.titles = { ...altered.titles, test: 'Test' };
  await expect(
    publishCardRelease(storage, new CardCatalog(altered), {
      ...r.metadata,
      checksum: new CardCatalog(altered).hash,
    }),
  ).rejects.toThrow('overwritten');
  await expect(
    publishCardRelease(storage, r.catalog, { ...r.metadata, runtimeFingerprint: 'c'.repeat(64) }),
  ).rejects.toThrow('Runtime code changed');
});
test('concurrent different publications retain both discovery entries', async () => {
  const storage = new MemoryObjects(),
    a = release('1.1.902'),
    b = release('1.1.903');
  await Promise.all([
    publishCardRelease(storage, a.catalog, a.metadata),
    publishCardRelease(storage, b.catalog, b.metadata),
  ]);
  expect((await availableReleases(storage)).releases.map(r => r.version)).toEqual([
    '1.1.903',
    '1.1.902',
  ]);
});
test('corrupt downloads and unsupported nested data cannot become installed definitions', async () => {
  const storage = new MemoryObjects(),
    r = release('1.1.904');
  await publishCardRelease(storage, r.catalog, r.metadata);
  storage.files.set(releaseKey(r.metadata), {
    etag: 'bad',
    bytes: gzipSync(JSON.stringify({ ...r.catalog.data, version: '1.1.905' })),
  });
  await expect(downloadRelease(storage, r.metadata)).rejects.toThrow('checksum');
});

test('concurrent publishers cannot reuse a runtime version for different executable sources', async () => {
  const storage = new MemoryObjects(),
    a = release('1.1.906'),
    b = release('1.1.907');
  const results = await Promise.allSettled([
    publishCardRelease(storage, a.catalog, a.metadata),
    publishCardRelease(storage, b.catalog, { ...b.metadata, runtimeFingerprint: 'd'.repeat(64) }),
  ]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await availableReleases(storage)).releases).toHaveLength(1);
});
