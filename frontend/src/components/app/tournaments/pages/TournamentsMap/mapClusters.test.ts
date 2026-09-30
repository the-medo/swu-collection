import { expect, test } from 'bun:test';
import { createMapClusters } from './mapClusters.ts';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';

const row = (id: string, x: number, y: number): MapTournament => ({
  id,
  name: id,
  date: '2026-11-07',
  days: 1,
  format: 1,
  type: 'pq',
  location: 'FR',
  meleeId: null,
  additionalInfo: {},
  updatedAt: '2026-09-01T00:00:00Z',
  coordinates: { x, y },
});

test('nearby venues cluster at world zoom and separate when zoomed in without losing same-venue events', () => {
  const index = createMapClusters([
    row('paris-a', 2.35, 48.85),
    row('paris-b', 2.35, 48.85),
    row('nearby', 2.38, 48.87),
    row('new-york', -74, 40.7),
  ]);
  const world = index.getClusters([-180, -90, 180, 90], 2);
  expect(world).toHaveLength(2);
  const cluster = world.find(f => 'cluster_id' in f.properties)!;
  if (!('cluster_id' in cluster.properties)) throw new Error('Expected a cluster.');
  const id = Number(cluster.properties.cluster_id);
  expect(
    index
      .getLeaves(id, Infinity)
      .flatMap(f => f.properties.tournaments)
      .map(t => t.id)
      .sort(),
  ).toEqual(['nearby', 'paris-a', 'paris-b']);
  expect(index.getClusterExpansionZoom(id)).toBeGreaterThan(2);
  const local = index.getClusters([-180, -90, 180, 90], 19);
  expect(local).toHaveLength(3);
  expect(
    local
      .flatMap(f => f.properties.tournaments)
      .map(t => t.id)
      .sort(),
  ).toEqual(['nearby', 'new-york', 'paris-a', 'paris-b']);
  expect(createMapClusters([]).getClusters([-180, -90, 180, 90], 2)).toEqual([]);
});
