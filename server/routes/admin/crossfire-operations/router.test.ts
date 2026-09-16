import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import type { CrossfireOperations } from '../../../lib/crossfire/operations.ts';
import { createCrossfireOperationsRouter } from './router.ts';

function fixture(status = 200) {
  const calls: unknown[] = [];
  const service = {
    status: async (hours: number) => {
      calls.push(hours);
      return {
        online: false,
        staleAfterSeconds: 45,
        historyBucketSeconds: 30,
        latest: null,
        history: [],
      };
    },
  } as unknown as CrossfireOperations;
  const app = new Hono<AuthExtension>().route(
    '/operations',
    createCrossfireOperationsRouter(
      () => service,
      async c =>
        status === 200
          ? { user: {} as NonNullable<AuthExtension['Variables']['user']>, response: null }
          : { user: null, response: c.json({ message: 'Denied' }, status === 401 ? 401 : 403) },
    ),
  );
  return { request: (query = '') => app.request(`/operations${query}`), calls };
}

test('operational metrics require an admin before reading telemetry', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    expect((await f.request()).status).toBe(status);
    expect(f.calls).toHaveLength(0);
  }
});

test('operational metrics accept only bounded history windows and disable caching', async () => {
  const f = fixture();
  const response = await f.request('?hours=24');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(f.calls).toEqual([24]);
  expect((await f.request()).status).toBe(200);
  expect(f.calls).toEqual([24, 6]);
  for (const query of ['?hours=0', '?hours=999', '?hours=6&unknown=value'])
    expect((await f.request(query)).status).toBe(400);
  expect(f.calls).toEqual([24, 6]);
  for (const hours of [168, 720, 8760, 'all'])
    expect((await f.request(`?hours=${hours}`)).status).toBe(200);
  expect(f.calls).toEqual([24, 6, 168, 720, 8760, 'all']);
});
