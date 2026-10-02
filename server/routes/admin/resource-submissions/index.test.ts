import { expect, test } from 'bun:test';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createResourceSubmissionsRoute } from './index.ts';

test('anonymous and non-admin callers cannot load submission data', async () => {
  let loads = 0;
  const list = async () => {
    loads++;
    return [];
  };
  const anonymous = createResourceSubmissionsRoute(list);
  expect((await anonymous.request('/')).status).toBe(401);
  const forbidden = createResourceSubmissionsRoute(list, async c => ({
    user: null,
    response: c.json({ message: 'Forbidden' }, 403),
  }));
  expect((await forbidden.request('/')).status).toBe(403);
  for (const method of ['PATCH', 'DELETE']) {
    expect((await anonymous.request('/not-an-id', { method })).status).toBe(401);
    expect((await forbidden.request('/not-an-id', { method })).status).toBe(403);
  }
  expect(loads).toBe(0);
});

test('administrators receive the list without a required weekend and without HTTP caching', async () => {
  let loads = 0;
  const route = createResourceSubmissionsRoute(
    async () => {
      loads++;
      return [];
    },
    async () => ({
      user: { id: 'admin' } as NonNullable<AuthExtension['Variables']['user']>,
      response: null,
    }),
  );
  const response = await route.request('/');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ data: [] });
  expect(loads).toBe(1);
  expect((await route.request('/invalid', { method: 'DELETE' })).status).toBe(400);
  expect(
    (
      await route.request('/' + crypto.randomUUID(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: 'true' }),
      })
    ).status,
  ).toBe(400);
});
