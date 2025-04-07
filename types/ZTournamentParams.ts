import { z } from 'zod';
import { zPaginationParams } from './ZPaginationParams.ts';
import { SwuSet } from './enums.ts';
import { TournamentSortField } from './ZTournament.ts';

export const zTournamentQueryParams = zPaginationParams.extend({
  // Tournament type filter - can be single type ID or minimum sort value
  type: z.string().optional(),
  minType: z.coerce.number().int().optional(),

  // Season filter - can be exact season or minimum season
  season: z.coerce.number().int().optional(),
  minSeason: z.coerce.number().int().optional(),

  // Set filter - only one set at a time
  set: z.enum(Object.values(SwuSet) as [string, ...string[]]).optional(),

  // Meta shakeup filter - events after a certain meta change
  minMetaShakeup: z.string().optional(),

  // Location and continental filters
  location: z.string().optional(),
  continent: z.string().optional(),

  // Attendance filter - minimum attendance
  minAttendance: z.coerce.number().int().optional(),

  // Format filter - exact format
  format: z.coerce.number().int().optional(),

  // Days filter - exact number of days
  days: z.coerce.number().int().optional(),

  // Date range filters
  minDate: z.string().optional(),
  maxDate: z.string().optional(),

  // Sorting
  sort: z
    .enum([
      TournamentSortField.DATE,
      TournamentSortField.CREATED_AT,
      TournamentSortField.UPDATED_AT,
      TournamentSortField.NAME,
      TournamentSortField.ATTENDANCE,
      TournamentSortField.SEASON,
      TournamentSortField.TYPE,
    ])
    .default(TournamentSortField.DATE),
});

export type TournamentQueryParams = z.infer<typeof zTournamentQueryParams>;
