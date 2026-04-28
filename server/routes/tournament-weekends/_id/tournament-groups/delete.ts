import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import {
  tournamentWeekend,
  tournamentWeekendTournamentGroup,
} from '../../../../db/schema/tournament_weekend.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { createLiveMetaGroupsPatchEvent } from '../../../../lib/live-tournaments/liveTournamentHomeCache.ts';

const zTournamentWeekendGroupDeleteQuery = z.object({
  tournamentGroupId: z.guid(),
});

export const tournamentWeekendIdTournamentGroupsDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('query', zTournamentWeekendGroupDeleteQuery),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const { tournamentGroupId } = c.req.valid('query');

    await db
      .delete(tournamentWeekendTournamentGroup)
      .where(
        and(
          eq(tournamentWeekendTournamentGroup.tournamentWeekendId, weekendId),
          eq(tournamentWeekendTournamentGroup.tournamentGroupId, tournamentGroupId),
        ),
      );

    await db
      .update(tournamentWeekend)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(tournamentWeekend.id, weekendId));

    await createLiveMetaGroupsPatchEvent(weekendId);

    return c.body(null, 204);
  },
);
