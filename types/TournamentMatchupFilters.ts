import { z } from 'zod';
import { SwuAspect } from './enums.ts';

export const matchupFilterNameMaxLength = 120;
export const matchupFilterTextMaxLength = 200;

export const zSwuAspect = z.enum(Object.values(SwuAspect) as [SwuAspect, ...SwuAspect[]]);

export const zMatchupDimensionFilterConfig = z.object({
  text: z.string().trim().max(matchupFilterTextMaxLength).default(''),
  aspects: z.array(zSwuAspect).default([]),
});

export const zMatchupTableFilterConfig = z.object({
  isMirrored: z.boolean().default(false),
  rowFilters: zMatchupDimensionFilterConfig,
  columnFilters: zMatchupDimensionFilterConfig,
});

export const zSavedTournamentMatchupFilter = z.object({
  id: z.guid(),
  userId: z.string(),
  format: z.number().int().positive(),
  name: z.string().max(matchupFilterNameMaxLength).nullable(),
  isMirrored: z.boolean(),
  rowFilters: zMatchupDimensionFilterConfig,
  columnFilters: zMatchupDimensionFilterConfig.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const zSavedTournamentMatchupFilterCreateRequest = z
  .object({
    format: z.number().int().positive(),
    name: z.string().trim().min(1).max(matchupFilterNameMaxLength).optional(),
    isMirrored: z.boolean().default(false),
    rowFilters: zMatchupDimensionFilterConfig,
    columnFilters: zMatchupDimensionFilterConfig.nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.isMirrored && value.columnFilters === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columnFilters'],
        message: 'Column filters are required unless filters are mirrored.',
      });
    }
  });

export type MatchupDimensionFilterConfig = z.infer<typeof zMatchupDimensionFilterConfig>;
export type MatchupTableFilterConfig = z.infer<typeof zMatchupTableFilterConfig>;
export type SavedTournamentMatchupFilter = z.infer<typeof zSavedTournamentMatchupFilter>;
export type SavedTournamentMatchupFilterCreateRequest = z.infer<
  typeof zSavedTournamentMatchupFilterCreateRequest
>;
