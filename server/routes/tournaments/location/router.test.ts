import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createTournamentLocationRouter } from './router.ts';
import { TournamentLocationError } from '../../../lib/tournaments/geocoding.ts';
import type { tournamentLocationService } from '../../../lib/tournaments/location.ts';

const id = '12345678-1234-4123-8123-123456789012';
function fixture(status = 200, failure?: TournamentLocationError) {
  const calls: unknown[][] = [];
  const invoke = async (...args: unknown[]) => {
    calls.push(args);
    if (failure) throw failure;
    return {};
  };
  const service = {
    list: invoke,
    save: invoke,
    compute: invoke,
  } as unknown as typeof tournamentLocationService;
  const app = new Hono<AuthExtension>().route(
    '/tournament',
    createTournamentLocationRouter(service, async c =>
      status === 200
        ? {
            user: { id: 'admin' } as NonNullable<AuthExtension['Variables']['user']>,
            response: null,
          }
        : { user: null, response: c.json({ message: 'Denied' }, status === 401 ? 401 : 403) },
    ),
  );
  const request = (path: string, method = 'GET', body?: unknown) =>
    app.request('/tournament' + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { request, calls };
}

test('all location operations deny anonymous and non-admin requests before service calls', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    expect((await f.request('/bulk/coordinates')).status).toBe(status);
    expect(
      (
        await f.request(`/${id}/additional-info`, 'PUT', {
          additionalInfo: {},
          expectedAdditionalInfo: {},
        })
      ).status,
    ).toBe(status);
    expect((await f.request(`/${id}/coordinates`, 'POST', {})).status).toBe(status);
    expect(f.calls).toHaveLength(0);
  }
});
test('validates ids, filters, JSON objects, force flag and expected version', async () => {
  const f = fixture();
  for (const [path, body] of [
    [`/${id}/coordinates`, { force: 'false' }],
    ['/bad/coordinates', {}],
  ] as const)
    expect((await f.request(path, 'POST', body)).status).toBe(400);
  expect((await f.request('/bulk/coordinates?set=invalid')).status).toBe(400);
  expect((await f.request(`/${id}/additional-info`, 'PUT', { additionalInfo: [] })).status).toBe(
    400,
  );
  expect(f.calls).toHaveLength(0);
  expect((await f.request('/bulk/coordinates?set=ash')).status).toBe(200);
  expect((await f.request(`/${id}/coordinates`, 'POST', {})).status).toBe(200);
  expect(
    (
      await f.request(`/${id}/additional-info`, 'PUT', {
        additionalInfo: { city: 'Paris' },
        expectedAdditionalInfo: {},
      })
    ).status,
  ).toBe(200);
  expect(f.calls).toEqual([['ash'], [id, false], [id, { city: 'Paris' }, {}]]);
});
test('returns expected conflicts, missing resources and provider errors', async () => {
  for (const status of [400, 404, 409, 429, 502, 503] as const) {
    const response = await fixture(
      200,
      new TournamentLocationError('Safe message', status),
    ).request(`/${id}/coordinates`, 'POST', { force: true });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Safe message' });
  }
});
