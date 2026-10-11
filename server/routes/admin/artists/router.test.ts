import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth';
import type { ArtistTransferAdmin } from '../../../lib/artists/admin';
import { ArtistTransferError } from '../../../lib/artists/errors';
import { createArtistTransferRouter } from './router';

const exportData = {
  format: 'swubase-artist-profiles',
  version: 2,
  exportedAt: new Date().toISOString(),
  artists: [],
  aliases: [],
};
function fixture(status = 200, failure = false) {
  const calls: { method: string; input: unknown }[] = [];
  const service = Object.fromEntries(
    ['status', 'list', 'export', 'publish', 'preview', 'apply'].map(method => [
      method,
      async (input: unknown) => {
        calls.push({ method, input });
        if (failure) throw new ArtistTransferError('Artist data changed since the preview.', 409);
        return method === 'export' ? exportData : {};
      },
    ]),
  ) as unknown as ArtistTransferAdmin;
  const app = new Hono<AuthExtension>().route(
    '/artists',
    createArtistTransferRouter(service, async c =>
      status === 200
        ? { user: {} as NonNullable<AuthExtension['Variables']['user']>, response: null }
        : { user: null, response: c.json({ message: 'Denied' }, status === 401 ? 401 : 403) },
    ),
  );
  return {
    calls,
    request: (path = '', body?: unknown) =>
      app.request(
        `/artists${path}`,
        body === undefined
          ? undefined
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            },
      ),
  };
}

test('every artist transfer route authorizes before accessing storage or data', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    for (const path of ['', '/snapshots', '/export'])
      expect((await f.request(path)).status).toBe(status);
    for (const path of ['/publish', '/upload', '/preview', '/apply'])
      expect((await f.request(path, {})).status).toBe(status);
    expect(f.calls).toHaveLength(0);
  }
});

test('admin transfer validates sources, strict snapshots and preview binding before writes', async () => {
  const f = fixture();
  const preview = { source: { kind: 'r2', key: 'artist-profiles/release.json' }, mode: 'merge' };
  for (const body of [
    { ...preview, source: { kind: 'r2', key: 'private/data.json' } },
    { ...preview, source: { kind: 'r2', key: 'artist-profiles/../release.json' } },
    { ...preview, source: { kind: 'research' } },
    { ...preview, source: { kind: 'r2', key: 'artist-research/research.json' } },
    { ...preview, mode: 'delete' },
    { ...preview, unexpected: true },
  ])
    expect((await f.request('/preview', body)).status).toBe(400);
  expect((await f.request('/apply', preview)).status).toBe(400);
  expect((await f.request('/upload', { ...exportData, credentials: 'no' })).status).toBe(400);
  expect((await f.request('/snapshots?cursor=&unknown=true')).status).toBe(400);
  expect(f.calls).toHaveLength(0);
  const sourcePreview = await f.request('/preview', preview);
  expect(sourcePreview.status).toBe(200);
  expect(sourcePreview.headers.get('cache-control')).toBe('no-store');
  const apply = { ...preview, sha256: '1'.repeat(64), expectedState: '2'.repeat(64) };
  expect((await f.request('/apply', apply)).status).toBe(200);
  expect(f.calls).toEqual([
    { method: 'preview', input: preview },
    { method: 'apply', input: apply },
  ]);
  expect((await f.request('/upload', exportData)).status).toBe(201);
  expect(f.calls.at(-1)).toEqual({ method: 'publish', input: exportData });
  expect((await f.request('/publish', {})).status).toBe(201);
  const exported = await f.request('/export');
  expect(exported.headers.get('content-disposition')).toContain('artist-profiles.json');
  expect(await exported.json()).toEqual(exportData);
});

test('admin transfer returns actionable conflict errors', async () => {
  const response = await fixture(200, true).request('/preview', {
    source: { kind: 'r2', key: 'artist-profiles/release.json' },
    mode: 'merge',
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ message: 'Artist data changed since the preview.' });
});
