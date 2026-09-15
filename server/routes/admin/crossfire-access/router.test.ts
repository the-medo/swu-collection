import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createCrossfireAccessRouter } from './router.ts';
import { CrossfireAccessError, type CrossfireAccess } from '../../../lib/crossfire/access.ts';
const origin = 'http://localhost:5174';
function fixture(status = 200, failure?: CrossfireAccessError) {
  const calls: unknown[][] = [];
  const service = {
    list: async (...args: unknown[]) => {
      calls.push(args);
      if (failure) throw failure;
      return { users: [], hasMore: false };
    },
    set: async (...args: unknown[]) => {
      calls.push(args);
      if (failure) throw failure;
      return {
        id: 'member',
        name: 'Member',
        email: 'member@invalid.local',
        roles: ['moderator', 'crossfire'],
        enabled: true,
      };
    },
  } as unknown as CrossfireAccess;
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: 'actor' } as NonNullable<AuthExtension['Variables']['user']>);
      c.set('session', { id: 'session' } as NonNullable<AuthExtension['Variables']['session']>);
      await next();
    })
    .route(
      '/access',
      createCrossfireAccessRouter(
        () => service,
        origin,
        async c =>
          status === 200
            ? { user: c.get('user')!, response: null }
            : { user: null, response: c.json({ message: 'Denied' }, status === 401 ? 401 : 403) },
      ),
    );
  const request = (path = '', method = 'GET', body?: unknown, source: string | null = origin) =>
    app.request('/access' + path, {
      method,
      headers: { ...(source ? { Origin: source } : {}), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { request, calls };
}
test('management denies anonymous and non-admin callers before reading account data', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    expect((await f.request()).status).toBe(status);
    expect((await f.request('/member', 'PATCH', { enabled: true })).status).toBe(status);
    expect(f.calls).toHaveLength(0);
  }
});
test('membership requests bind the actor to the session and accept only the Crossfire toggle', async () => {
  const f = fixture();
  const response = await f.request('?search=Member');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(f.calls[0]).toEqual([{ userId: 'actor', sessionId: 'session' }, 'Member']);
  expect((await f.request('/member', 'PATCH', { enabled: true })).status).toBe(200);
  expect(f.calls[1]).toEqual([{ userId: 'actor', sessionId: 'session' }, 'member', true]);
  for (const body of [
    { enabled: true, role: 'admin' },
    { enabled: true, userId: 'actor' },
    { enabled: 'true' },
    {},
  ])
    expect((await f.request('/member', 'PATCH', body)).status).toBe(400);
  expect((await f.request('?search=' + 'a'.repeat(121))).status).toBe(400);
  expect((await f.request('?unknown=value')).status).toBe(400);
  expect((await f.request('/member', 'PATCH', { note: 'a'.repeat(2000) })).status).toBe(413);
  expect(f.calls).toHaveLength(2);
});
test('role writes require the exact origin and map expected denial and not-found errors', async () => {
  for (const source of [null, 'http://localhost:5173', origin + '.invalid']) {
    const f = fixture();
    expect((await f.request('/member', 'PATCH', { enabled: true }, source)).status).toBe(403);
    expect(f.calls).toHaveLength(0);
  }
  for (const status of [401, 403, 404] as const)
    expect(
      (
        await fixture(200, new CrossfireAccessError(status)).request('/member', 'PATCH', {
          enabled: false,
        })
      ).status,
    ).toBe(status);
});
