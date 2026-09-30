import { expect, test } from 'bun:test';
import { createTournamentMapRoute } from './get.ts';
import { fourMonthWindow } from '../../../../shared/lib/tournamentMapDates.ts';

test('public map accepts default/custom windows and rejects invalid dates, ranges and cursors', async () => {
  const calls: unknown[] = [];
  const window = fourMonthWindow('2026-10-02');
  const app = createTournamentMapRoute(async query => {
    calls.push(query);
    return {
      window,
      range: window,
      tournaments: [],
      highlights: [],
      versions: [],
      updatedAt: null,
    };
  });
  for (const query of [
    '?from=bad',
    '?from=2026-02-30',
    '?to=2026-10-02',
    '?from=2026-10-02&to=2026-10-01',
    '?from=2026-10-02&to=2028-10-01',
    '?updatedSince=yesterday',
  ])
    expect((await app.request('/' + query)).status).toBe(400);
  expect(calls).toHaveLength(0);
  expect((await app.request('/')).status).toBe(200);
  expect((await app.request('/?from=2026-09-01')).status).toBe(200);
  const updatedSince = '2026-09-01T00:00:00.123456Z';
  const result = await app.request(`/?from=2026-10-02&to=2026-11-01&updatedSince=${updatedSince}`);
  expect(result.status).toBe(200);
  expect(result.headers.get('cache-control')).toBe('no-store');
  expect(calls).toEqual([
    {},
    { from: '2026-09-01' },
    { from: '2026-10-02', to: '2026-11-01', updatedSince },
  ]);
});
