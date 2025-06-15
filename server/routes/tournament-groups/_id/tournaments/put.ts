import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentGroup as tournamentGroupTable } from '../../../../db/schema/tournament_group.ts';
import { tournamentGroupTournament as tournamentGroupTournamentTable } from '../../../../db/schema/tournament_group_tournament.ts';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';

// Define request body schema
const zTournamentGroupTournamentUpdateRequest = z.object({
  tournamentId: z.string().uuid(),
  position: z.number().int(),
});

export const tournamentGroupIdTournamentsPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zTournamentGroupTournamentUpdateRequest),
  async c => {
    const user = c.get('user');
    const groupId = z.string().uuid().parse(c.req.param('id'));
    const { tournamentId, position } = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournamentGroup: ['updateTournamentPosition'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to update a tournament's position in a group.",
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

    // Update the tournament's position in the group
    await db
      .update(tournamentGroupTournamentTable)
      .set({
        position,
      })
      .where(
        and(
          eq(tournamentGroupTournamentTable.groupId, groupId),
          eq(tournamentGroupTournamentTable.tournamentId, tournamentId),
        ),
      );

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

    return c.json({ data: result[0] });
  },
);
