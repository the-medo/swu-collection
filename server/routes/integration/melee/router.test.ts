import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createMeleeConnectionRouter } from './router.ts';
import { MeleeConnectionError } from '../../../lib/melee/profile.ts';

function fixture(authenticated = true, failure?: MeleeConnectionError) {
  const calls: unknown[][] = [];
  const invoke = async (...args: unknown[]) => {
    calls.push(args);
    if (failure) throw failure;
    return { connection: null, challenge: null };
  };
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        authenticated
          ? ({ id: 'session-owner' } as NonNullable<AuthExtension['Variables']['user']>)
          : null,
      );
      await next();
    })
    .route(
      '/melee',
      createMeleeConnectionRouter({
        status: invoke,
        start: invoke,
        verify: invoke,
        disconnect: invoke,
      }),
    );
  return {
    calls,
    request: (path: string, method = 'GET', body?: unknown) =>
      app.request('/melee' + (path === '/' ? '' : path), {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
  };
}

test('all operations reject anonymous callers before validation or service calls', async () => {
  const f = fixture(false);
  for (const [path, method] of [
    ['/', 'GET'],
    ['/challenge', 'POST'],
    ['/verify', 'POST'],
    ['/', 'DELETE'],
  ]) {
    const response = await f.request(path!, method);
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
  expect(f.calls).toHaveLength(0);
});

test('uses only the session owner and validates challenge input', async () => {
  const f = fixture();
  expect((await f.request('/challenge', 'POST', { username: '../admin' })).status).toBe(400);
  expect(f.calls).toHaveLength(0);
  expect((await f.request('/')).status).toBe(200);
  expect(
    (await f.request('/challenge', 'POST', { username: ' Example ', userId: 'victim' })).status,
  ).toBe(200);
  expect((await f.request('/verify', 'POST', { userId: 'victim' })).status).toBe(200);
  expect((await f.request('/', 'DELETE')).status).toBe(200);
  expect(f.calls).toEqual([
    ['session-owner'],
    ['session-owner', 'Example'],
    ['session-owner'],
    ['session-owner'],
  ]);
});

test('preserves safe domain errors and prevents challenge caching', async () => {
  for (const status of [400, 404, 409, 429, 502] as const) {
    const response = await fixture(true, new MeleeConnectionError('Try again', status)).request(
      '/verify',
      'POST',
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Try again' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
});
