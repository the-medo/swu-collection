import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../db/schema/tournament.ts';
import { db } from '../../../db';
import { tournamentDeck as tournamentDeckTable } from '../../../db/schema/tournament_deck.ts';
import { tournamentMatch as tournamentMatchTable } from '../../../db/schema/tournament_match.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { updateTournamentGroupStatistics } from '../../../lib/card-statistics/update-tournament-group-statistics.ts';

export const tournamentIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const paramTournamentId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const isOwner = eq(tournamentTable.userId, user.id);
  const tournamentId = eq(tournamentTable.id, paramTournamentId);

  // First check if the tournament exists and the user is the owner
  const tournament = (await db.select().from(tournamentTable).where(and(isOwner, tournamentId)))[0];

  if (!tournament) {
    return c.json(
      {
        message: "Tournament doesn't exist or you don't have permission to delete it",
      },
      404,
    );
  }

  // Get the list of groups that contain this tournament before deleting it
  const groups = await db
    .select({ groupId: tournamentGroupTournament.groupId })
    .from(tournamentGroupTournament)
    .where(eq(tournamentGroupTournament.tournamentId, paramTournamentId));

  // Delete related tournament matches
  await db
    .delete(tournamentMatchTable)
    .where(eq(tournamentMatchTable.tournamentId, paramTournamentId));

  // Delete related tournament decks
  await db
    .delete(tournamentDeckTable)
    .where(eq(tournamentDeckTable.tournamentId, paramTournamentId));

  // Delete the tournament
  const deletedTournament = (
    await db.delete(tournamentTable).where(and(isOwner, tournamentId)).returning()
  )[0];

  // Update statistics for each affected group after the tournament is deleted
  try {
    for (const group of groups) {
      await updateTournamentGroupStatistics(group.groupId);
    }
  } catch (error) {
    console.error('Error updating tournament group statistics:', error);
    // Continue with the response even if statistics update fails
  }

  return c.json({ data: deletedTournament });
});
