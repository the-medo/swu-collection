import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createAiReleaseRouter } from './router.ts';
import { AiError } from '../../../../play/ai/releases/objects.ts';
import { releaseFixture } from '../../../../play/testing/ai/release-fixtures.ts';
import { versions } from '../../../../play/engine/model.ts';

function fixture(access: 'anonymous' | 'user' | 'admin', failure = false) {
  const calls: unknown[][] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        access === 'anonymous'
          ? null
          : ({ id: 'authenticated-admin' } as NonNullable<AuthExtension['Variables']['user']>),
      );
      await next();
    })
    .route(
      '/ai',
      createAiReleaseRouter(
        () => ({
          async importRelease(manifest, weights) {
            calls.push(['upload', manifest, weights.length]);
            return { id: 'fixture', checksum: 'a'.repeat(64) };
          },
          async status() {
            calls.push(['status']);
            throw new AiError('Fixture status unavailable');
          },
          async preview(input) {
            calls.push(['preview', input]);
            throw new AiError('Fixture preview unavailable');
          },
          async activate(input, actor) {
            calls.push(['activate', input, actor]);
            if (failure) throw new AiError('Active release changed');
          },
        }),
        async c =>
          access === 'admin'
            ? { user: c.get('user')!, response: null }
            : {
                user: null,
                response: c.json({ message: 'Denied' }, access === 'anonymous' ? 401 : 403),
              },
      ),
    );
  return { app, calls };
}
test('AI admin routes deny unauthenticated/non-admin access before invoking services', async () => {
  for (const [access, status] of [
    ['anonymous', 401],
    ['user', 403],
  ] as const) {
    const f = fixture(access);
    for (const path of ['/ai', '/ai/preview', '/ai/activate', '/ai/upload']) {
      const response = await f.app.request(path, { method: path === '/ai' ? 'GET' : 'POST' });
      expect(response.status).toBe(status);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(f.calls).toEqual([]);
  }
});
test('activation binds the actor, validates payloads and reports stale/failed activations', async () => {
  const { release } = releaseFixture();
  const input = { id: release.id, checksum: 'a'.repeat(64), versions, expectedActive: null };
  const f = fixture('admin');
  const post = (body: unknown) =>
    f.app.request('/ai/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  expect((await post({ ...input, actorId: 'forged' })).status).toBe(400);
  expect(f.calls).toEqual([]);
  expect((await post(input)).status).toBe(200);
  expect(f.calls[0]).toEqual(['activate', input, 'authenticated-admin']);
  const denied = await fixture('admin', true).app.request('/ai/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  expect(denied.status).toBe(409);
  expect(await denied.json()).toEqual({ message: 'Active release changed' });
});

test('uploads require the trusted origin and validate multipart files before import', async () => {
  const before = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = 'https://fixture.local';
  try {
    const f = fixture('admin');
    expect(
      (
        await f.app.request('/ai/upload', {
          method: 'POST',
          headers: { Origin: 'https://attacker.local' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await f.app.request('/ai/upload', {
          method: 'POST',
          headers: { Origin: 'https://fixture.local' },
          body: 'broken',
        })
      ).status,
    ).toBe(400);
    const form = new FormData();
    form.set('manifest', new File(['{"schema":1}'], 'release.json'));
    expect(
      (
        await f.app.request('/ai/upload', {
          method: 'POST',
          headers: { Origin: 'https://fixture.local' },
          body: form,
        })
      ).status,
    ).toBe(400);
    expect(f.calls).toEqual([]);
    form.set('weights', new File(['weights'], 'model.pt'));
    expect(
      (
        await f.app.request('/ai/upload', {
          method: 'POST',
          headers: { Origin: 'https://fixture.local' },
          body: form,
        })
      ).status,
    ).toBe(200);
    expect(f.calls).toEqual([['upload', { schema: 1 }, 7]]);
  } finally {
    if (before === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = before;
  }
});
