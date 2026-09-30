import Supercluster from 'supercluster';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { hasMapCoordinates } from './mapData.ts';

export function createMapClusters(tournaments: MapTournament[]) {
  // Keep identical venues together even beyond the clustering zoom limit.
  const venues = new Map<string, MapTournament[]>();
  for (const tournament of tournaments.filter(hasMapCoordinates)) {
    const key = `${tournament.coordinates.x},${tournament.coordinates.y}`;
    const events = venues.get(key) ?? [];
    events.push(tournament);
    venues.set(key, events);
  }
  return new Supercluster<{ tournaments: MapTournament[] }>({ radius: 40, maxZoom: 18 }).load(
    Array.from(venues.values(), events => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [events[0].coordinates!.x, events[0].coordinates!.y],
      },
      properties: { tournaments: events },
    })),
  );
}
