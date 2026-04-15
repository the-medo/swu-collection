import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { db } from '../../../../../db';
import {
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../../../../db/schema/tournament_weekend.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';

const zTournamentWeekendResourceUpdateRequest = z.object({
  approved: z.boolean(),
});

export const tournamentWeekendIdResourcesResourceIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('json', zTournamentWeekendResourceUpdateRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const resourceId = z.guid().parse(c.req.param('resourceId'));
    const { approved } = c.req.valid('json');

    const existingResource = (
      await db
        .select({ resourceId: tournamentWeekendResource.id })
        .from(tournamentWeekendResource)
        .innerJoin(
          tournamentWeekendTournament,
          eq(tournamentWeekendResource.tournamentId, tournamentWeekendTournament.tournamentId),
        )
        .where(
          and(
            eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
            eq(tournamentWeekendResource.id, resourceId),
          ),
        )
        .limit(1)
    )[0];

    if (!existingResource) {
      return c.json({ message: 'Tournament weekend resource not found' }, 404);
    }

    const resource = (
      await db
        .update(tournamentWeekendResource)
        .set({
          approved,
          updatedAt: sql`NOW()`,
        })
        .where(eq(tournamentWeekendResource.id, resourceId))
        .returning()
    )[0];

    return c.json({ data: resource });
  },
);
