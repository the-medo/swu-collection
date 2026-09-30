import { expect, test } from 'bun:test';
import { mergeTournamentMap, type TournamentMapCache } from './tournamentMap.ts';
import type { MapTournament, TournamentMapResponse } from '../../../types/TournamentMap.ts';
import { SwuSet } from '../../../types/enums.ts';

const row = (id: string, updatedAt = '2026-09-01T00:00:00.000001Z'): MapTournament => ({
  id,
  updatedAt,
  name: id,
  date: '2026-10-01',
  days: 1,
  type: 'pq',
  format: 1,
  location: 'BR',
  meleeId: null,
  coordinates: { x: -46.63, y: -23.55 },
  additionalInfo: {},
});
const cache = (tournaments: MapTournament[]): TournamentMapCache => ({
  set: SwuSet.HMW,
  tournaments,
  updatedAt: tournaments[tournaments.length - 1]?.updatedAt ?? null,
  revision: 'one',
});
const response = (
  tournaments: MapTournament[],
  versions = tournaments.map(({ id, updatedAt }) => ({ id, updatedAt })),
): TournamentMapResponse => ({
  set: SwuSet.HMW,
  tournaments,
  versions,
  updatedAt: versions[versions.length - 1]?.updatedAt ?? null,
});

test('merges updates and additions, keeps unchanged rows, and removes deleted or moved rows', () => {
  const unchanged = row('unchanged');
  const updated = { ...row('updated', '2026-09-02T00:00:00.000001Z'), coordinates: null };
  const added = row('added');
  const result = mergeTournamentMap(
    cache([unchanged, row('updated'), row('deleted')]),
    response([updated, added], [unchanged, updated, added]),
  );
  expect(result).toHaveLength(3);
  expect(result?.find(t => t.id === 'updated')?.coordinates).toBeNull();
  expect(result?.find(t => t.id === 'unchanged')).toEqual(unchanged);
  expect(result?.some(t => t.id === 'deleted')).toBe(false);
  expect(mergeTournamentMap(cache([row('deleted')]), response([]))).toEqual([]);
});

test('requests recovery for set reassignment or an older transaction committed after the cursor', () => {
  expect(mergeTournamentMap(cache([]), response([], [row('moved')]))).toBeNull();
  const changed = row('existing', '2026-09-01T00:00:00.000002Z');
  expect(mergeTournamentMap(cache([row('existing')]), response([], [changed]))).toBeNull();
  expect(mergeTournamentMap(undefined, response([changed]))).toEqual([changed]);
  expect(
    mergeTournamentMap(cache([changed]), { ...response([], [changed]), set: SwuSet.ASH }),
  ).toBeNull();
});
