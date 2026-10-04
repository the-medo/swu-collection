import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createUserTournamentsRouter } from './user-tournaments.ts';
import { MeleeConnectionError } from '../lib/melee/profile.ts';
import type { UserMeleeTournamentsResponse } from '../../shared/types/UserMeleeTournaments.ts';

function fixture(viewer: string | null = null, failure?: MeleeConnectionError) {
  let refreshes = 0;
  const response: UserMeleeTournamentsResponse = {
    connected: false,
    lastRefreshedAt: null,
    nextRefreshAt: null,
    tournaments: [],
    stats: {
      topEights: 0,
      pqOpenTotal: 0,
      dayTwos: 0,
      majorTotal: 0,
      unknownDayTwoCutoffs: 0,
      bestMajorFinishes: [],
    },
  };
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
      );
      await next();
    })
    .route(
      '/user',
      createUserTournamentsRouter({
        get: async () => {
          if (failure) throw failure;
          return response;
        },
        refresh: async () => {
          refreshes++;
          if (failure) throw failure;
          return response;
        },
      }),
    );
  return { app, refreshes: () => refreshes };
}
test('history is public, refresh requires the profile owner', async () => {
  for (const [viewer, status] of [
    [null, 401],
    ['other', 403],
    ['owner', 200],
  ] as const) {
    const f = fixture(viewer);
    const read = await f.app.request('/user/owner/tournaments');
    expect(read.status).toBe(200);
    expect(read.headers.get('cache-control')).toBe('no-store');
    expect(
      (await f.app.request('/user/owner/tournaments/refresh', { method: 'POST' })).status,
    ).toBe(status);
    expect(f.refreshes()).toBe(status === 200 ? 1 : 0);
  }
});
test('validates params and preserves expected service error status', async () => {
  expect((await fixture().app.request(`/user/${'x'.repeat(201)}/tournaments`)).status).toBe(400);
  for (const status of [404, 409, 429, 502] as const) {
    const response = await fixture(
      'owner',
      new MeleeConnectionError('Safe message', status),
    ).app.request('/user/owner/tournaments/refresh', { method: 'POST' });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Safe message' });
  }
});

test('tournament cache headers do not affect sibling profile routes', async () => {
  const { app } = fixture();
  app.get('/user/:id/collection', c => c.json({ data: [] }));
  const response = await app.request('/user/owner/collection');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBeNull();
});
