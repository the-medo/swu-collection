import { expect, test } from 'bun:test';
import { createTournamentMapRoute } from './get.ts';

test('public map validates its set and timestamp, and passes inclusive microsecond cursors', async () => {
  const calls: unknown[] = [];
  const app = createTournamentMapRoute(async (set, updatedSince) => {
    calls.push({ set, updatedSince });
    return { set, tournaments: [], versions: [], updatedAt: null };
  });
  for (const query of ['', '?set=bad', '?set=hmw&updatedSince=yesterday']) {
    expect((await app.request('/' + query)).status).toBe(400);
  }
  expect(calls).toHaveLength(0);
  const cursor = '2026-09-01T00:00:00.123456Z';
  const result = await app.request(`/?set=hmw&updatedSince=${cursor}`);
  expect(result.status).toBe(200);
  expect(result.headers.get('cache-control')).toBe('no-store');
  expect(calls).toEqual([{ set: 'hmw', updatedSince: cursor }]);
});
