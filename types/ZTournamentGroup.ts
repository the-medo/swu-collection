import { z } from 'zod';
import { booleanPreprocessor } from '../shared/lib/zod/booleanPreprocessor.ts';

// Schema for creating a tournament group
export const zTournamentGroupCreateRequest = z.object({
  name: z.string().min(1).max(255),
  metaId: z.number().int().optional(),
  position: z.number().int().optional().default(0),
  description: z.string().optional(),
  visible: booleanPreprocessor.optional().default(true),
});

// Schema for updating a tournament group
export const zTournamentGroupUpdateRequest = z.object({
  name: z.string().min(1).max(255).optional(),
  metaId: z.number().int().optional(),
  position: z.number().int().optional(),
  description: z.string().optional(),
  visible: booleanPreprocessor.optional(),
});

// Schema for assigning a tournament to a group
export const zTournamentGroupTournamentCreateRequest = z.object({
  tournamentId: z.guid(),
  position: z.number().int().optional().default(0),
});

// Schema for updating a tournament's position in a group
export const zTournamentGroupTournamentUpdateRequest = z.object({
  tournamentId: z.guid(),
  position: z.number().int(),
});

// Types inferred from the schemas
export type ZTournamentGroupCreateRequest = z.infer<typeof zTournamentGroupCreateRequest>;
export type ZTournamentGroupUpdateRequest = z.infer<typeof zTournamentGroupUpdateRequest>;
export type ZTournamentGroupTournamentCreateRequest = z.infer<
  typeof zTournamentGroupTournamentCreateRequest
>;
export type ZTournamentGroupTournamentUpdateRequest = z.infer<
  typeof zTournamentGroupTournamentUpdateRequest
>;
