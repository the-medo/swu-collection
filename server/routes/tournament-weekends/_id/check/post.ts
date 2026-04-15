import { Hono } from 'hono';
import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
} from '../../../../db/schema/tournament_weekend.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';

export const tournamentWeekendIdCheckPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const weekendId = z.guid().parse(c.req.param('id'));
  const weekend = (
    await db
      .select({ id: tournamentWeekend.id })
      .from(tournamentWeekend)
      .where(eq(tournamentWeekend.id, weekendId))
      .limit(1)
  )[0];

  if (!weekend) {
    return c.json({ message: 'Tournament weekend not found' }, 404);
  }

  const eligibleTournaments = await db
    .select({
      weekendTournament: tournamentWeekendTournament,
      tournament: tournamentTable,
    })
    .from(tournamentWeekendTournament)
    .innerJoin(tournamentTable, eq(tournamentWeekendTournament.tournamentId, tournamentTable.id))
    .where(
      and(
        eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
        ne(tournamentWeekendTournament.status, 'finished'),
        isNotNull(tournamentTable.meleeId),
        sql`${tournamentTable.meleeId} <> ''`,
      ),
    );

  return c.json(
    {
      message: 'Live tournament check service is not implemented yet.',
      data: {
        eligibleTournamentCount: eligibleTournaments.length,
        eligibleTournaments,
      },
    },
    501,
  );
});
