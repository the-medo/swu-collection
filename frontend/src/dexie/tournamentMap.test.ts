import { expect, test } from 'bun:test';
import { mapSyncRequests, mergeTournamentMap } from './tournamentMap.ts';
import type { MapTournament, TournamentMapResponse } from '../../../types/TournamentMap.ts';

const row = (id: string, updatedAt = '2026-09-01T00:00:00.000001Z'): MapTournament => ({
  id,
  updatedAt,
  name: id,
  date: '2026-10-02',
  days: 1,
  type: 'pq',
  format: 1,
  location: 'BR',
  meleeId: null,
  coordinates: null,
  additionalInfo: {},
});
const response = (
  tournaments: MapTournament[],
  versions = tournaments.map(({ id, date, updatedAt }) => ({ id, date, updatedAt })),
): TournamentMapResponse => ({
  range: { from: '2026-10-02', to: '2027-02-01' },
  window: { from: '2026-10-02', to: '2027-02-01' },
  tournaments,
  versions,
  highlights: [],
  updatedAt: versions[versions.length - 1]?.updatedAt ?? null,
});

test('delta merge keeps unchanged rows, updates existing rows and removes missing membership', () => {
  const unchanged = row('unchanged');
  const updated = { ...row('updated', '2026-09-02T00:00:00.000001Z'), date: '2026-10-09' };
  const added = row('added');
  const result = mergeTournamentMap(
    [unchanged, row('updated'), row('deleted')],
    response([updated, added], [unchanged, updated, added]),
  );
  expect(result).toHaveLength(3);
  expect(result?.find(t => t.id === 'updated')?.date).toBe('2026-10-09');
  expect(result?.find(t => t.id === 'unchanged')).toEqual(unchanged);
  expect(result?.some(t => t.id === 'deleted')).toBe(false);
  expect(mergeTournamentMap([row('deleted')], response([]))).toEqual([]);
});

test('date moves and late commits trigger snapshot recovery even with old timestamps', () => {
  expect(mergeTournamentMap([], response([], [row('moved')]))).toBeNull();
  const changed = row('existing', '2026-09-01T00:00:00.000002Z');
  expect(mergeTournamentMap([row('existing')], response([], [changed]))).toBeNull();
  expect(
    mergeTournamentMap(
      [row('existing')],
      response([], [{ ...row('existing'), date: '2026-10-09' }]),
    ),
  ).toBeNull();
  expect(mergeTournamentMap([], response([changed]))).toEqual([changed]);
});

test('overlapping ranges request only missing dates in full and delta-sync existing coverage', () => {
  const range = { from: '2026-10-01', to: '2026-10-07' };
  const old = '2026-09-01T00:00:00.000001Z';
  const newer = '2026-09-02T00:00:00.000001Z';
  expect(mapSyncRequests(range, [])).toEqual([{ ...range, updatedSince: undefined }]);
  expect(
    mapSyncRequests(range, [
      { date: '2026-10-02', updatedAt: newer },
      { date: '2026-10-03', updatedAt: old },
      { date: '2026-10-04', updatedAt: newer },
      { date: '2026-10-06', updatedAt: newer },
    ]),
  ).toEqual([
    { from: '2026-10-01', to: '2026-10-01', updatedSince: undefined },
    { from: '2026-10-02', to: '2026-10-04', updatedSince: old },
    { from: '2026-10-05', to: '2026-10-05', updatedSince: undefined },
    { from: '2026-10-06', to: '2026-10-06', updatedSince: newer },
    { from: '2026-10-07', to: '2026-10-07', updatedSince: undefined },
  ]);
});
