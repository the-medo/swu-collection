import { z } from 'zod';
import { SwuSet } from './enums.ts';
import type { TournamentAdditionalInfo, TournamentCoordinates } from './TournamentLocation.ts';

export const zTournamentMapQuery = z.object({
  set: z.enum(SwuSet),
  updatedSince: z.iso.datetime().optional(),
});

export interface MapTournament {
  id: string;
  name: string;
  date: string;
  days: number;
  type: string;
  format: number;
  location: string;
  meleeId: string | null;
  coordinates: TournamentCoordinates | null;
  additionalInfo: TournamentAdditionalInfo;
  updatedAt: string;
}

export interface TournamentMapResponse {
  set: SwuSet;
  tournaments: MapTournament[];
  // Small membership/version manifest reconciles deletions, set moves and late commits.
  versions: { id: string; updatedAt: string }[];
  updatedAt: string | null;
}
