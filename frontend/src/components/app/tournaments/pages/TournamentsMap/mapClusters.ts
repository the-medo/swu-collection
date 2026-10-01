import Supercluster from 'supercluster';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { hasMapCoordinates } from './mapData.ts';

interface MapMarker {
  tournaments: MapTournament[];
  coordinates: [number, number];
  expansionZoom?: number;
}

// Saved events stay separate, including events sharing an exact venue.
export function createMapMarkers(
  tournaments: MapTournament[],
  savedIds: { has: (id: string) => boolean },
) {
  const index = createMapClusters(tournaments.filter(t => !savedIds.has(t.id)));
  const saved: MapMarker[] = tournaments
    .filter(hasMapCoordinates)
    .flatMap(tournament =>
      savedIds.has(tournament.id)
        ? [
            {
              tournaments: [tournament],
              coordinates: [tournament.coordinates.x, tournament.coordinates.y],
            },
          ]
        : [],
    );
  return (zoom: number): MapMarker[] => [
    ...index.getClusters([-180, -90, 180, 90], Math.floor(zoom)).map(feature => {
      const clusterId =
        'cluster_id' in feature.properties ? Number(feature.properties.cluster_id) : undefined;
      return {
        tournaments:
          clusterId === undefined
            ? feature.properties.tournaments
            : index.getLeaves(clusterId, Infinity).flatMap(leaf => leaf.properties.tournaments),
        coordinates: feature.geometry.coordinates as [number, number],
        expansionZoom:
          clusterId === undefined ? undefined : index.getClusterExpansionZoom(clusterId),
      };
    }),
    ...saved,
  ];
}

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
