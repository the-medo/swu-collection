import { z } from 'zod';
import type { MapTournament } from './TournamentMap.ts';

export const tournamentSaveStatuses = ['saved', 'maybe', 'going'] as const;
export const tournamentSaveInput = z.object({ status: z.enum(tournamentSaveStatuses) }).strict();
export type TournamentSaveStatus = (typeof tournamentSaveStatuses)[number];

export interface SavedTournament {
  tournamentId: string;
  status: TournamentSaveStatus;
  additionalInfo: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  tournament: MapTournament;
}
