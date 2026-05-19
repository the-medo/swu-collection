import { zValidator } from '@hono/zod-validator';
import { desc, eq, and } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { tournamentMatchupFilter } from '../../db/schema/tournament_matchup_filter.ts';
import { savedTournamentMatchupFilterLimit } from './constants.ts';

const zTournamentMatchupFilterListQuery = z.object({
  format: z.coerce.number().int().positive(),
});

export const tournamentMatchupFiltersGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zTournamentMatchupFilterListQuery),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { format } = c.req.valid('query');

    const filters = await db
      .select()
      .from(tournamentMatchupFilter)
      .where(
        and(
          eq(tournamentMatchupFilter.userId, user.id),
          eq(tournamentMatchupFilter.format, format),
        ),
      )
      .orderBy(desc(tournamentMatchupFilter.updatedAt), desc(tournamentMatchupFilter.createdAt))
      .limit(savedTournamentMatchupFilterLimit);

    return c.json({ data: filters });
  },
);
