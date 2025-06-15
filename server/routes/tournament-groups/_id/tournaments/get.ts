import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../../db/schema/tournament_group.ts';
import { tournamentGroupTournament as tournamentGroupTournamentTable } from '../../../../db/schema/tournament_group_tournament.ts';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { z } from 'zod';

export const tournamentGroupIdTournamentsGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const groupId = z.string().uuid().parse(c.req.param('id'));

  // Check if the tournament group exists
  const existingGroup = await db
    .select()
    .from(tournamentGroupTable)
    .where(eq(tournamentGroupTable.id, groupId));

  if (existingGroup.length === 0) {
    return c.json({ message: 'Tournament group not found' }, 404);
  }

  // Get all tournaments in the group
  const tournaments = await db
    .select({
      tournament: tournamentTable,
      position: tournamentGroupTournamentTable.position,
    })
    .from(tournamentGroupTournamentTable)
    .innerJoin(tournamentTable, eq(tournamentGroupTournamentTable.tournamentId, tournamentTable.id))
    .where(eq(tournamentGroupTournamentTable.groupId, groupId))
    .orderBy(tournamentGroupTournamentTable.position);

  return c.json({ data: tournaments });
});
