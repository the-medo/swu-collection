import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createUserTournamentReportRouter } from './user-tournament-report.ts';
import { MeleeConnectionError } from '../lib/melee/profile.ts';

const tournamentId = crypto.randomUUID();
function fixture(viewer: string | null, failure?: MeleeConnectionError) {
  const calls: string[][] = [];
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
      createUserTournamentReportRouter({
        get: async (id, eventId) => {
          calls.push([id, eventId]);
          if (failure) throw failure;
          return {
            tournament: {
              id: eventId,
              name: 'Event',
              date: '2026-10-10',
              format: null,
              attendance: 64,
              placement: null,
              record: null,
              completed: true,
            },
            deck: null,
            rounds: [],
            hasMetaDecks: false,
          };
        },
      }),
    );
  return { app, calls };
}
test('only the authenticated owner may request a report; unauthorized requests never reach the service', async () => {
  for (const [viewer, expected] of [
    [null, 401],
    ['other', 403],
    ['owner', 200],
  ] as const) {
    const { app, calls } = fixture(viewer);
    const response = await app.request(`/user/owner/tournaments/${tournamentId}/report`);
    expect(response.status).toBe(expected);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(calls).toEqual(expected === 200 ? [['owner', tournamentId]] : []);
  }
});
test('validates IDs and handles unavailable history without leaking internals', async () => {
  const { app, calls } = fixture('owner');
  expect((await app.request('/user/owner/tournaments/not-an-id/report')).status).toBe(400);
  expect(calls).toHaveLength(0);
  for (const status of [404, 409, 502] as const) {
    const response = await fixture(
      'owner',
      new MeleeConnectionError('Safe message', status),
    ).app.request(`/user/owner/tournaments/${tournamentId}/report`);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Safe message' });
  }
});
