import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { updateTournamentGroupStatistics } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';

export const tournamentGroupIdRecomputePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');
  const tournamentGroupId = z.string().uuid().parse(c.req.param('id'));
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        statistics: ['compute'],
      },
    },
  });

  if (!hasPermission.success) {
    return c.json(
      {
        message: "You don't have permission to recompute tournament group stats.",
      },
      403,
    );
  }

  // Update tournament group statistics
  try {
    await updateTournamentGroupStatistics(tournamentGroupId);
  } catch (error) {
    console.error('Error updating tournament group statistics:', error);
    // Continue with the response even if statistics update fails
  }

  return c.json(
    {
      data: {
        message: 'Tournament group recomputed',
      },
    },
    201,
  );
});
