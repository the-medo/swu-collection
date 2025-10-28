import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  computeAndSaveTournamentStatistics,
  computeAndSaveMetaStatistics,
} from '../../lib/card-statistics';

// Define query parameters schema
const zComputeCardStatsParams = z
  .object({
    meta_id: z.coerce.number().int().optional(),
    tournament_id: z.guid().optional(),
  })
  .refine(
    data => {
      // Either meta_id or tournament_id must be provided, but not both
      return (data.meta_id !== undefined) !== (data.tournament_id !== undefined);
    },
    {
      message: 'Exactly one of meta_id or tournament_id must be provided',
      path: ['meta_id', 'tournament_id'],
    },
  );

export const cardStatsComputeRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('query', zComputeCardStatsParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    // Check if user has admin permission
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
          message: "You don't have permission to compute card statistics.",
        },
        403,
      );
    }

    const { meta_id, tournament_id } = c.req.valid('query');

    try {
      let result;

      if (meta_id !== undefined) {
        // Compute meta statistics
        result = await computeAndSaveMetaStatistics(meta_id);
        return c.json(
          {
            message: `Successfully computed statistics for meta ID: ${meta_id}`,
            data: {
              metaId: meta_id,
              cardStatsCount: result.cardStats.length,
              cardStatsLeaderCount: result.cardStatsLeader.length,
              cardStatsLeaderBaseCount: result.cardStatsLeaderBase.length,
            },
          },
          200,
        );
      } else if (tournament_id !== undefined) {
        // Compute tournament statistics
        result = await computeAndSaveTournamentStatistics(tournament_id);
        return c.json(
          {
            message: `Successfully computed statistics for tournament ID: ${tournament_id}`,
            data: {
              tournamentId: tournament_id,
              cardStatsCount: result.cardStats.length,
              cardStatsLeaderCount: result.cardStatsLeader.length,
              cardStatsLeaderBaseCount: result.cardStatsLeaderBase.length,
            },
          },
          200,
        );
      }
    } catch (error) {
      console.error('Error computing card statistics:', error);
      return c.json(
        {
          message: 'Failed to compute card statistics',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);
