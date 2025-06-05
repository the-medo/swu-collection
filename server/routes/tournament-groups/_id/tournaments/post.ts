import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../../db/schema/tournament_group.ts';
import { tournamentGroupTournament as tournamentGroupTournamentTable } from '../../../../db/schema/tournament_group_tournament.ts';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { updateTournamentGroupStatistics } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';

// Define request body schema
const zTournamentGroupTournamentCreateRequest = z.object({
  tournamentId: z.string().uuid(),
  position: z.number().int().optional(),
});

export const tournamentGroupIdTournamentsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentGroupTournamentCreateRequest),
  async c => {
    const user = c.get('user');
    const groupId = z.string().uuid().parse(c.req.param('id'));
    const { tournamentId, position = 0 } = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournamentGroup: ['assignTournament'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to assign a tournament to a group.",
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

    // Check if the tournament exists
    const existingTournament = await db
      .select()
      .from(tournamentTable)
      .where(eq(tournamentTable.id, tournamentId));

    if (existingTournament.length === 0) {
      return c.json({ message: 'Tournament not found' }, 404);
    }

    // Check if the tournament is already in the group
    const existingRelation = await db
      .select()
      .from(tournamentGroupTournamentTable)
      .where(
        and(
          eq(tournamentGroupTournamentTable.groupId, groupId),
          eq(tournamentGroupTournamentTable.tournamentId, tournamentId),
        ),
      );

    if (existingRelation.length > 0) {
      return c.json({ message: 'Tournament is already in the group' }, 400);
    }

    // Add the tournament to the group
    await db.insert(tournamentGroupTournamentTable).values({
      groupId,
      tournamentId,
      position,
    });

    // Get the updated tournament with position
    const result = await db
      .select({
        tournament: tournamentTable,
        position: tournamentGroupTournamentTable.position,
      })
      .from(tournamentGroupTournamentTable)
      .innerJoin(
        tournamentTable,
        eq(tournamentGroupTournamentTable.tournamentId, tournamentTable.id),
      )
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

    return c.json({ data: result[0] }, 201);
  },
);
