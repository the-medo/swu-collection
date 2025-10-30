import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../../db/schema/tournament_group.ts';
import { tournamentGroupTournament as tournamentGroupTournamentTable } from '../../../../db/schema/tournament_group_tournament.ts';
import { updateTournamentGroupStatistics } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';

// Define query parameters schema
const zTournamentGroupTournamentDeleteParams = z.object({
  tournamentId: z.guid(),
});

export const tournamentGroupIdTournamentsDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('query', zTournamentGroupTournamentDeleteParams),
  async c => {
    const user = c.get('user');
    const groupId = z.guid().parse(c.req.param('id'));
    const { tournamentId } = c.req.valid('query');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournamentGroup: ['removeTournament'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to remove a tournament from a group.",
        },
        403,
      );
    }

    // Check if the tournament group exists
    const existingGroup = await db
      .select()
      .from(tournamentGroupTable)
      .where(eq(tournamentGroupTable.id, groupId));

    if (existingGroup.length === 0) {
      return c.json({ message: 'Tournament group not found' }, 404);
    }

    // Check if the tournament exists in the group
    const existingRelation = await db
      .select()
      .from(tournamentGroupTournamentTable)
      .where(
        and(
          eq(tournamentGroupTournamentTable.groupId, groupId),
          eq(tournamentGroupTournamentTable.tournamentId, tournamentId),
        ),
      );

    if (existingRelation.length === 0) {
      return c.json({ message: 'Tournament is not in the group' }, 404);
    }

    // Remove the tournament from the group
    await db
      .delete(tournamentGroupTournamentTable)
      .where(
        and(
          eq(tournamentGroupTournamentTable.groupId, groupId),
          eq(tournamentGroupTournamentTable.tournamentId, tournamentId),
        ),
      );

    // Update tournament group statistics
    try {
      await updateTournamentGroupStatistics(groupId);
    } catch (error) {
      console.error('Error updating tournament group statistics:', error);
      // Continue with the response even if statistics update fails
    }

    return c.json({ message: 'Tournament removed from group successfully' });
  },
);
