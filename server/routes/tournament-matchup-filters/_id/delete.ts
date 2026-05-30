import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { tournamentMatchupFilter } from '../../../db/schema/tournament_matchup_filter.ts';

const zParams = z.object({
  id: z.uuid(),
});

export const tournamentMatchupFiltersIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id } = c.req.valid('param');

    const [deleted] = await db
      .delete(tournamentMatchupFilter)
      .where(and(eq(tournamentMatchupFilter.id, id), eq(tournamentMatchupFilter.userId, user.id)))
      .returning({ id: tournamentMatchupFilter.id });

    if (!deleted) {
      return c.json({ message: 'Saved matchup filter not found' }, 404);
    }

    return c.body(null, 204);
  },
);
