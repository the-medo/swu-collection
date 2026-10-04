import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createUserAvatarRoute } from './post.ts';
import { AvatarError } from '../../../lib/user-avatar/image.ts';

const input = {
  cardId: 'card',
  variantId: 'version',
  side: 'front',
  crop: { left: 10, top: 20, size: 100 },
};
const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' };
function fixture(authenticated = true, failure?: AvatarError, now = Date.now) {
  const calls: unknown[][] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        authenticated
          ? ({ id: 'session-user' } as NonNullable<AuthExtension['Variables']['user']>)
          : null,
      );
      await next();
    })
    .route(
      '/avatar',
      createUserAvatarRoute(async (...args) => {
        calls.push(args);
        if (failure) throw failure;
        return { image: 'https://images.swubase.com/user-data/session-user/avatar.webp?v=1' };
      }, now),
    );
  return { app, calls };
}
describe('POST user avatar', () => {
  test('accepts an uploaded image ID with crop coordinates', async () => {
    const { app, calls } = fixture();
    const uploaded = { fileId: crypto.randomUUID(), crop: input.crop };
    const response = await app.request('/avatar', {
      method: 'POST',
      headers,
      body: JSON.stringify(uploaded),
    });
    expect(response.status).toBe(200);
    expect(calls).toEqual([['session-user', uploaded]]);
  });
  test('source lookup requires a session and uses only its owner', async () => {
    const owners: string[] = [];
    const source = { cardId: 'card', variantId: 'version', side: 'back' as const };
    const route = createUserAvatarRoute(undefined, undefined, async id => {
      owners.push(id);
      return source;
    });
    expect((await route.request('/')).status).toBe(401);
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set('user', { id: 'owner' } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route('/avatar', route);
    const response = await app.request('/avatar?userId=someone-else');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: source });
    expect(owners).toEqual(['owner']);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  test('uses the authenticated owner and returns the saved image', async () => {
    const { app, calls } = fixture();
    const response = await app.request('/avatar', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    expect(response.status).toBe(200);
    expect(calls).toEqual([['session-user', input]]);
    expect((await response.json()).data.image).toContain('/session-user/avatar.webp?v=');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  test('rejects anonymous requests before reading input', async () => {
    const { app, calls } = fixture(false);
    expect((await app.request('/avatar', { method: 'POST' })).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  test('rejects cross-origin form requests', async () => {
    const { app, calls } = fixture();
    expect(
      (
        await app.request('/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
      ).status,
    ).toBe(403);
    expect(calls).toHaveLength(0);
  });
  test('rejects malformed, oversized and ownership-injection requests', async () => {
    const { app, calls } = fixture();
    for (const body of [
      '{',
      JSON.stringify({ ...input, userId: 'victim' }),
      JSON.stringify({ ...input, crop: { left: -1, top: 0, size: 100 } }),
    ]) {
      expect((await app.request('/avatar', { method: 'POST', headers, body })).status).toBe(400);
    }
    expect(
      (
        await app.request('/avatar', {
          method: 'POST',
          headers: { ...headers, 'Content-Length': '5012' },
          body: JSON.stringify({ extra: 'x'.repeat(5000) }),
        })
      ).status,
    ).toBe(413);
    expect(calls).toHaveLength(0);
  });
  test('surfaces safe storage, source, and crop failures', async () => {
    for (const status of [400, 404, 502, 503] as const) {
      const { app } = fixture(true, new AvatarError('Try another card.', status));
      const response = await app.request('/avatar', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: 'Try another card.' });
    }
  });
  test('limits saves to five per minute and allows retry after the window', async () => {
    let time = 1_000;
    const { app, calls } = fixture(true, undefined, () => time);
    const request = () =>
      app.request('/avatar', { method: 'POST', headers, body: JSON.stringify(input) });
    for (let i = 0; i < 5; i++) expect((await request()).status).toBe(200);
    const limited = await request();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(calls).toHaveLength(5);
    time += 60_001;
    expect((await request()).status).toBe(200);
  });
  test('rejects overlapping saves for the same owner and releases the guard after failure', async () => {
    let release!: () => void;
    let started!: () => void;
    const running = new Promise<void>(resolve => {
      started = resolve;
    });
    const wait = new Promise<void>(resolve => {
      release = resolve;
    });
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set('user', { id: 'owner' } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route(
        '/avatar',
        createUserAvatarRoute(async () => {
          started();
          await wait;
          throw new AvatarError('Upload failed.', 502);
        }),
      );
    const request = () =>
      app.request('/avatar', { method: 'POST', headers, body: JSON.stringify(input) });
    const first = request();
    await running;
    expect((await request()).status).toBe(429);
    release();
    expect((await first).status).toBe(502);
    expect((await request()).status).toBe(502);
  });
});
