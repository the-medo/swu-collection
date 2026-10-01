import type { TournamentSaveStatus } from '../../../../../../../types/UserTournamentSave.ts';

// Shared silhouettes for the map and the smaller week-slider markers (40 × 40).
export const savedTournamentMarkers: Record<
  TournamentSaveStatus,
  { label: string; priority: number; path: string }
> = {
  going: {
    label: 'Going',
    priority: 0,
    path: 'M2 21 L8 15 L16 23 L31 5 L38 11 L16 37 Z',
  },
  maybe: {
    label: 'Maybe',
    priority: 1,
    path: 'M7 12 C7 5 12 1 20 1 C29 1 34 6 34 13 C34 18 31 21 26 24 C24 25 23 26 23 28 L15 28 C15 23 17 21 22 18 C25 16 26 15 26 12 C26 9 24 8 20 8 C16 8 15 10 15 12 Z M24 35 A4 4 0 1 1 16 35 A4 4 0 1 1 24 35 Z',
  },
  saved: {
    label: 'Saved',
    priority: 2,
    path: 'M20 2 L25.5 13.5 L38 15 L28.5 24 L31 37 L20 31 L9 37 L11.5 24 L2 15 L14.5 13.5 Z',
  },
};

// Overlap busy weeks while keeping the whole stack within three marker heights.
export function savedMarkerStackHeight(count: number) {
  return count ? 24 + Math.min(48, (count - 1) * 12) : 0;
}
