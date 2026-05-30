import { zValidator } from '@hono/zod-validator';
import { and, count, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { tournamentMatchupFilter } from '../../db/schema/tournament_matchup_filter.ts';
import {
  type MatchupDimensionFilterConfig,
  zSavedTournamentMatchupFilterCreateRequest,
} from '../../../types/TournamentMatchupFilters.ts';
import { savedTournamentMatchupFilterLimit } from './constants.ts';

function normalizeDimensionFilter(
  filter: MatchupDimensionFilterConfig,
): MatchupDimensionFilterConfig {
  return {
    text: filter.text,
    aspects: Array.from(new Set(filter.aspects)),
  };
}

function hasActiveDimensionFilter(filter: MatchupDimensionFilterConfig | null): boolean {
  return !!filter && (filter.text.length > 0 || filter.aspects.length > 0);
}

function getDatabaseErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

export const tournamentMatchupFiltersPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zSavedTournamentMatchupFilterCreateRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const data = c.req.valid('json');
    const rowFilters = normalizeDimensionFilter(data.rowFilters);
    let columnFilters: MatchupDimensionFilterConfig | null = null;

    if (!data.isMirrored) {
      if (!data.columnFilters) {
        return c.json({ message: 'Column filters are required unless filters are mirrored.' }, 400);
      }

      columnFilters = normalizeDimensionFilter(data.columnFilters);
    }

    if (!hasActiveDimensionFilter(rowFilters) && !hasActiveDimensionFilter(columnFilters)) {
      return c.json({ message: 'Cannot save an empty matchup filter.' }, 400);
    }

    try {
      const result = await db.transaction(
        async tx => {
          const [existingFilterCount] = await tx
            .select({ count: count() })
            .from(tournamentMatchupFilter)
            .where(
              and(
                eq(tournamentMatchupFilter.userId, user.id),
                eq(tournamentMatchupFilter.format, data.format),
              ),
            );

          if ((existingFilterCount?.count ?? 0) >= savedTournamentMatchupFilterLimit) {
            return { status: 'limit' as const };
          }

          const [created] = await tx
            .insert(tournamentMatchupFilter)
            .values({
              userId: user.id,
              format: data.format,
              name: data.name ?? null,
              isMirrored: data.isMirrored,
              rowFilters,
              columnFilters,
            })
            .returning();

          if (!created) throw new Error('Failed to create matchup filter');

          return { status: 'created' as const, created };
        },
        { isolationLevel: 'serializable' },
      );

      if (result.status === 'limit') {
        return c.json(
          {
            message: `You can save up to ${savedTournamentMatchupFilterLimit} matchup filters per format.`,
          },
          400,
        );
      }

      return c.json({ data: result.created }, 201);
    } catch (error) {
      const code = getDatabaseErrorCode(error);

      if (code === '23503') {
        return c.json({ message: 'Invalid format.' }, 400);
      }

      if (code === '40001') {
        return c.json({ message: 'Could not save filter yet. Please try again.' }, 409);
      }

      throw error;
    }
  },
);
