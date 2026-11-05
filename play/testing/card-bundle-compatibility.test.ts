import { expect, test } from 'bun:test';
import type { Sql } from 'postgres';
import { checksum } from '../cards/catalog.ts';
import { loadGameVersions } from '../storage/card-bundles.ts';
import previewRecording from './fixtures/replay-compatibility/hmw-preview-ids.json';

test('game admission reports a retired stored bundle as unsupported', async () => {
  const catalog = previewRecording.catalog;
  const sql = (async () => [
    {
      definitions: catalog,
      checksum: checksum(catalog),
      required_engine: catalog.requiredEngine,
    },
  ]) as unknown as Sql;
  const versions = JSON.parse(previewRecording.cases[0]!.checkpoint).versions;
  expect(await loadGameVersions(sql, versions)).toBe(false);
});

test('admins can replace a retired active release while retired selections stay unavailable', async () => {
  const { CrossfireCardReleases } = await import('../../server/lib/crossfire/cardReleases.ts');
  const { bundledCatalog } = await import('../cards/catalog.ts');
  const { CardBundleError, activeCardVersions } = await import('../storage/card-bundles.ts');
  const { ENGINE_VERSION } = await import('../engine/release.ts');
  const installed = ['1.4.0', '1.5.0'].map(version => ({
    version,
    checksum: version === '1.5.0' ? bundledCatalog.hash : 'a'.repeat(64),
    required_engine: version,
    source_commit: 'b'.repeat(40),
    created_at: new Date('2026-11-05T12:00:00Z'),
    r2_key: null,
  }));
  const remote = ['1.3.0', '1.6.0'].map(version => ({
    version,
    checksum: 'c'.repeat(64),
    requiredEngine: version,
    runtimeVersion: ENGINE_VERSION,
    runtimeFingerprint: 'd'.repeat(64),
    sourceCommit: 'b'.repeat(40),
    publishedAt: '2026-11-05T12:00:00Z',
    cards: 1,
  }));
  let activeVersion = '1.4.0';
  const query = async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const text = parts.join('?');
    if (text.startsWith('SELECT checksum')) return [{ checksum: bundledCatalog.hash }];
    if (text.startsWith('SELECT value')) return [{ value: activeVersion }];
    if (text.startsWith('SELECT b.version'))
      return installed.filter(r => r.version === activeVersion);
    if (text.startsWith('SELECT version, checksum')) return installed;
    if (text.startsWith('SELECT source_commit'))
      return installed.filter(r => r.version === values[0]);
    if (text.startsWith('SELECT definitions'))
      return installed.filter(r => r.version === values[0]);
    if (text.startsWith('UPDATE public.application_configuration')) {
      activeVersion = String(values[0]);
      return [];
    }
    if (text.startsWith('SELECT pg_notify')) return [];
    if (text.startsWith('INSERT INTO')) return [];
    throw new Error(`Unexpected query: ${text}`);
  };
  const sql = Object.assign(query, {
    begin: async (run: (tx: Sql) => Promise<void>) => run(sql),
    json: (value: unknown) => value,
  }) as unknown as Sql;
  const service = new CrossfireCardReleases(sql, {
    async read() {
      return {
        bytes: new TextEncoder().encode(JSON.stringify({ schema: 1, releases: remote })),
        etag: 'index',
      };
    },
    async write() {
      throw new Error('Read-only fixture');
    },
  });
  const status = await service.status();
  expect(status.activeVersion).toBe('1.4.0');
  await expect(activeCardVersions(sql)).rejects.toThrow(CardBundleError);
  expect(Object.fromEntries(status.releases.map(r => [r.version, r.compatible]))).toEqual({
    '1.3.0': false,
    '1.4.0': false,
    '1.5.0': true,
    '1.6.0': false,
  });
  await expect(
    service.preview({
      source: 'installed',
      version: '1.4.0',
      checksum: installed[0]!.checksum,
    }),
  ).rejects.toThrow(CardBundleError);
  await expect(
    service.preview({
      source: 'remote',
      version: '1.3.0',
      checksum: remote[0]!.checksum,
    }),
  ).rejects.toThrow(CardBundleError);
  const selection = {
    source: 'installed' as const,
    version: '1.5.0',
    checksum: bundledCatalog.hash,
  };
  const preview = await service.preview(selection);
  expect(preview).toMatchObject({
    currentVersion: '1.4.0',
    comparisonAvailable: false,
    total: bundledCatalog.data.cards.length,
    added: [],
    changed: [],
    removed: [],
  });
  await service.activate({ ...selection, expectedActive: preview.currentVersion });
  expect((await service.status()).activeVersion).toBe('1.5.0');
  expect((await activeCardVersions(sql)).cards).toBe(bundledCatalog.pin);
  expect(await service.preview(selection)).toMatchObject({
    currentVersion: '1.5.0',
    comparisonAvailable: true,
    added: [],
    changed: [],
    removed: [],
  });
  await expect(service.activate({ ...selection, expectedActive: '1.4.0' })).rejects.toThrow(
    'active release changed',
  );
});
