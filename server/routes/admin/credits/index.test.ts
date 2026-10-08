import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createCreditsAdminRoute } from './index.ts';
import { CreditsError, creditsService } from '../../../lib/credits/service.ts';

function fixture(status = 200, failure?: CreditsError) {
  const calls: unknown[][] = [];
  const service: typeof creditsService = {
    grantStartingCredits: async () => {},
    users: async (...args) => {
      calls.push(args);
      if (failure) throw failure;
      return { users: [], hasMore: false };
    },
    grant: async (...args) => {
      calls.push(args);
      if (failure) throw failure;
      return { userId: 'target', amount: 500, balance: 10500, applied: true };
    },
  };
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: 'actor' } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route(
      '/credits',
      createCreditsAdminRoute(service, async c =>
        status === 200
          ? { user: c.get('user')!, response: null }
          : { user: null, response: c.json({ message: 'Denied' }, status === 401 ? 401 : 403) },
      ),
    );
  const request = (body: unknown, header = true) =>
    app.request('/credits/target/grants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(JSON.stringify(body))),
        ...(header ? { 'X-Requested-With': 'swubase' } : {}),
      },
      body: JSON.stringify(body),
    });
  return { app, request, calls };
}

test('credit administration denies anonymous and ordinary users before reading or writing', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    expect((await f.app.request('/credits')).status).toBe(status);
    expect((await f.request({ amount: 500, requestId: crypto.randomUUID() })).status).toBe(status);
    expect(f.calls).toHaveLength(0);
  }
});

test('credit grants bind the admin to the session and validate amounts, keys and request size', async () => {
  const f = fixture();
  const input = { amount: 500, requestId: crypto.randomUUID() };
  const list = await f.app.request('/credits?search=Member');
  expect(list.status).toBe(200);
  expect(list.headers.get('Cache-Control')).toBe('private, no-store');
  expect(f.calls[0]).toEqual(['Member']);
  expect((await f.request(input)).status).toBe(200);
  expect(f.calls[1]).toEqual(['target', 'actor', input]);
  for (const body of [
    { ...input, amount: 0 },
    { ...input, amount: -10 },
    { ...input, amount: 1.5 },
    { ...input, amount: Number.MAX_SAFE_INTEGER + 1 },
    { ...input, amount: '500' },
    { ...input, requestId: 'invalid' },
    { ...input, actorId: 'another-admin' },
    { amount: 500 },
  ])
    expect((await f.request(body)).status).toBe(400);
  expect((await f.request(input, false)).status).toBe(403);
  expect((await f.request({ note: 'a'.repeat(1500) })).status).toBe(413);
  expect((await f.app.request('/credits?search=' + 'a'.repeat(121))).status).toBe(400);
  expect((await f.app.request('/credits?unknown=field')).status).toBe(400);
  expect(f.calls).toHaveLength(2);
});

test('expected grant conflicts, unsafe balances and missing users return safe errors', async () => {
  for (const status of [400, 404, 409] as const) {
    const f = fixture(200, new CreditsError('Expected failure.', status));
    const response = await f.request({ amount: 500, requestId: crypto.randomUUID() });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Expected failure.' });
  }
});
