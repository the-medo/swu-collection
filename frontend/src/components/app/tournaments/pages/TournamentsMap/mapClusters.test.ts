import { expect, test } from 'bun:test';
import { createMapClusters, createMapMarkers } from './mapClusters.ts';
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

test('saved events stay individual at every zoom, even at shared venues, while other events cluster', () => {
  const tournaments = [
    row('saved-a', 2.35, 48.85),
    row('saved-b', 2.35, 48.85),
    row('unsaved-a', 2.35, 48.85),
    row('unsaved-b', 2.35, 48.85),
    row('nearby', 2.38, 48.87),
    { ...row('unlocated', 0, 0), coordinates: null },
  ];
  const savedIds = new Set(['saved-a', 'saved-b', 'unlocated']);
  const getMarkers = createMapMarkers(tournaments, savedIds);
  for (const zoom of [0, 2, 10, 19]) {
    const markers = getMarkers(zoom);
    for (const id of ['saved-a', 'saved-b']) {
      const marker = markers.find(marker => marker.tournaments.some(t => t.id === id));
      expect(marker?.tournaments.map(t => t.id)).toEqual([id]);
      expect(marker?.expansionZoom).toBeUndefined();
    }
    expect(markers.flatMap(marker => marker.tournaments.map(t => t.id)).sort()).toEqual([
      'nearby',
      'saved-a',
      'saved-b',
      'unsaved-a',
      'unsaved-b',
    ]);
  }
  const cluster = getMarkers(2).find(marker => marker.expansionZoom !== undefined);
  expect(cluster?.tournaments.map(t => t.id).sort()).toEqual(['nearby', 'unsaved-a', 'unsaved-b']);
  expect(cluster?.expansionZoom).toBeGreaterThan(2);
  expect(
    getMarkers(19)
      .find(marker => marker.tournaments.length === 2)
      ?.tournaments.map(t => t.id),
  ).toEqual(['unsaved-a', 'unsaved-b']);
});

test('saving and removing events repartitions clusters without dropping or duplicating tournaments', () => {
  const tournaments = [row('a', 2.35, 48.85), row('b', 2.38, 48.87)];
  for (const savedIds of [
    new Set<string>(),
    new Set(['a']),
    new Set(['a', 'b']),
    new Set<string>(),
  ]) {
    const markers = createMapMarkers(tournaments, savedIds)(0);
    expect(markers).toHaveLength(savedIds.size ? 2 : 1);
    expect(markers.flatMap(marker => marker.tournaments.map(t => t.id)).sort()).toEqual(['a', 'b']);
    if (savedIds.size)
      expect(markers.every(marker => marker.expansionZoom === undefined)).toBe(true);
  }
  expect(createMapMarkers([], new Set())(0)).toEqual([]);
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
