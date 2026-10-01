import { z } from 'zod';
import type { EventHighlight } from './EventHighlight.ts';
import type { TournamentAdditionalInfo, TournamentCoordinates } from './TournamentLocation.ts';

export const zTournamentMapQuery = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    updatedSince: z.iso.datetime().optional(),
  })
  .superRefine(({ from, to }, ctx) => {
    if (to && (!from || to < from || Date.parse(to) - Date.parse(from) > 366 * 86400000))
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Provide a from/to range of at most one year.',
      });
  });

export interface TournamentMapRange {
  from: string;
  to: string;
}

export interface TournamentMapData {
  window: TournamentMapRange;
  range: TournamentMapRange;
  tournaments: MapTournament[];
  highlights: EventHighlight[];
}

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

export interface TournamentMapResponse extends TournamentMapData {
  // Membership/version manifest reconciles deletions, date moves and late commits.
  versions: { id: string; date: string; updatedAt: string }[];
  updatedAt: string | null;
}
