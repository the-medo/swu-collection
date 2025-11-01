import { z } from 'zod';
import { formatData } from './Format.ts';
import { BracketInfo, SwuSet } from './enums.ts';
import { booleanPreprocessor } from '../shared/lib/zod/booleanPreprocessor.ts';

export const TournamentSortField = {
  DATE: 'tournament.date',
  CREATED_AT: 'tournament.created_at',
  UPDATED_AT: 'tournament.updated_at',
  NAME: 'tournament.name',
  ATTENDANCE: 'tournament.attendance',
  SEASON: 'meta.season',
  TYPE: 'tournament_type.sort_value',
} as const;

export const zMetaSchema = z.object({
  id: z.number().int(),
  set: z.enum(Object.values(SwuSet) as [string, ...string[]]),
  name: z.string().min(1).max(255),
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
  date: z.string(),
  season: z.number().int().min(0),
});

export const zTournamentSchema = z.object({
  id: z.guid(),
  userId: z.string(),
  type: z.string(),
  meta: z.number().int().nullable().optional(),
  location: z.string().min(1).max(255),
  continent: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  attendance: z.number().int().min(0),
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
  dayTwoPlayerCount: z.number().int().min(0),
  date: z.string(),
  imported: booleanPreprocessor.optional(),
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
  bracketInfo: z
    .enum(Object.values(BracketInfo) as [string, ...string[]])
    .default('top8')
    .optional(),
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
  forcedRoundId: z.string().min(0).max(20).optional(),
  markAsImported: booleanPreprocessor.optional().default(true),
  minRound: z.number().int().optional(),
  maxRound: z.number().int().optional(),
});

export type ZTournament = z.infer<typeof zTournamentSchema>;
export type ZMeta = z.infer<typeof zMetaSchema>;
export type ZTournamentCreateRequest = z.infer<typeof zTournamentCreateRequest>;
export type ZTournamentUpdateRequest = z.infer<typeof zTournamentUpdateRequest>;
export type ZTournamentImportMeleeRequest = z.infer<typeof zTournamentImportMeleeRequest>;
