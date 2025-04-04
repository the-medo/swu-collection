import { z } from 'zod';
import { formatData } from './Format.ts';
import { SwuSet } from './enums.ts';

export const TournamentSortField = {
  DATE: 'tournament.date',
  CREATED_AT: 'tournament.created_at',
  UPDATED_AT: 'tournament.updated_at',
  NAME: 'tournament.name',
  ATTENDANCE: 'tournament.attendance',
  SEASON: 'tournament.season',
  TYPE: 'tournament_type.sort_value',
} as const;

export const zTournamentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: z.string(),
  season: z.number().int().positive(),
  set: z.enum(Object.values(SwuSet) as [string, ...string[]]),
  metaShakeup: z.string().nullable().optional(),
  location: z.string().min(1).max(255),
  continent: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  attendance: z.number().int().positive(),
  meleeId: z.string().max(255).nullable().optional(),
  format: z
    .number()
    .int()
    .refine(
      val => {
        return formatData.some(format => format.id === val);
      },
      {
        message: 'Invalid format ID',
      },
    ),
  days: z.number().int().positive(),
  date: z.string().or(z.date()),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const zTournamentCreateRequest = zTournamentSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const zTournamentUpdateRequest = zTournamentSchema
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export const zTournamentImportMeleeRequest = z.object({
  meleeId: z.string().min(1).max(255),
});

export type ZTournament = z.infer<typeof zTournamentSchema>;
export type ZTournamentCreateRequest = z.infer<typeof zTournamentCreateRequest>;
export type ZTournamentUpdateRequest = z.infer<typeof zTournamentUpdateRequest>;
export type ZTournamentImportMeleeRequest = z.infer<typeof zTournamentImportMeleeRequest>;
