import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { db } from '../../../../db';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import {
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../../../db/schema/tournament_weekend.ts';

const zTournamentWeekendResourceListQuery = z.object({
  status: z.enum(['all', 'pending', 'approved']).default('all'),
});

export const tournamentWeekendIdResourcesGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zTournamentWeekendResourceListQuery),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const { status } = c.req.valid('query');

    const statusCondition =
      status === 'pending'
        ? eq(tournamentWeekendResource.approved, false)
        : status === 'approved'
          ? eq(tournamentWeekendResource.approved, true)
          : undefined;

    const rows = await db
      .select({
        resource: tournamentWeekendResource,
        tournament: {
          id: tournamentTable.id,
          name: tournamentTable.name,
          location: tournamentTable.location,
          meleeId: tournamentTable.meleeId,
        },
        submitterName: userTable.displayName,
      })
      .from(tournamentWeekendResource)
      .innerJoin(
        tournamentWeekendTournament,
        eq(tournamentWeekendResource.tournamentId, tournamentWeekendTournament.tournamentId),
      )
      .innerJoin(tournamentTable, eq(tournamentWeekendResource.tournamentId, tournamentTable.id))
      .leftJoin(userTable, eq(tournamentWeekendResource.userId, userTable.id))
      .where(
        and(
          eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
          ...(statusCondition ? [statusCondition] : []),
        ),
      )
      .orderBy(asc(tournamentWeekendResource.approved), desc(tournamentWeekendResource.createdAt));

    return c.json({ data: rows });
  },
);
