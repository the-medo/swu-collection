import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../db';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { cardStatMatchupOverview } from '../../db/schema/card_stat_matchup_schema.ts';
import {
  initCardStatMatchupOverview,
  computeCardStatMatchupTournaments,
  computeCardStatMatchupDecks,
  getRelevantMatches,
} from '../../lib/card-statistics/matchup-stats';

// Define query parameters schema
const zMatchupStatsQueryParams = z
  .object({
    meta_id: z.coerce.number().int().optional(),
    tournament_id: z.string().uuid().optional(),
    tournament_group_id: z.string().uuid().optional(),
    leaderId: z.string().optional(),
    baseId: z.string().optional(),
    leaderId2: z.string().optional(),
    baseId2: z.string().optional(),
  })
  .refine(
    data => {
      // Either meta_id, tournament_id, or tournament_group_id must be provided
      return (
        data.meta_id !== undefined ||
        data.tournament_id !== undefined ||
        data.tournament_group_id !== undefined
      );
    },
    {
      message: 'Either meta_id, tournament_id, or tournament_group_id must be provided',
      path: ['meta_id', 'tournament_id', 'tournament_group_id'],
    },
  )
  .refine(
    data => {
      // At least one parameter from deck 1 must be provided
      return data.leaderId !== undefined || data.baseId !== undefined;
    },
    {
      message: 'At least one parameter from deck 1 (leaderId or baseId) must be provided',
      path: ['leaderId', 'baseId'],
    },
  )
  .refine(
    data => {
      // At least one parameter from deck 2 must be provided
      return data.leaderId2 !== undefined || data.baseId2 !== undefined;
    },
    {
      message: 'At least one parameter from deck 2 (leaderId2 or baseId2) must be provided',
      path: ['leaderId2', 'baseId2'],
    },
  );

export const cardStatsMatchupRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zMatchupStatsQueryParams),
  async c => {
    const { meta_id, tournament_id, tournament_group_id, leaderId, baseId, leaderId2, baseId2 } =
      c.req.valid('query');

    // Get the user ID from the context if available
    const userId = c.get('user')?.id;

    // Step 1: Initialize the matchup overview and get the ID
    const overviewId = await initCardStatMatchupOverview(userId, {
      meta_id,
      tournament_id,
      tournament_group_id,
      leaderId,
      baseId,
      leaderId2,
      baseId2,
    });

    // Step 2: Compute tournament IDs and store them
    const tournamentIds = await computeCardStatMatchupTournaments(overviewId, {
      meta_id,
      tournament_id,
      tournament_group_id,
    });

    // Step 3: Compute deck IDs for the first deck and store them
    const deckIds = await computeCardStatMatchupDecks(overviewId, leaderId, baseId);

    const { cardMatchMap, matchCount } = await getRelevantMatches(overviewId, leaderId2, baseId2);

    // Step 4: Update the overview with the finish time
    await db
      .update(cardStatMatchupOverview)
      .set({ finishedAt: new Date() })
      .where(eq(cardStatMatchupOverview.id, overviewId));

    // Return the response
    return c.json({
      data: {
        overviewId,
        tournamentCount: tournamentIds.length,
        deckCount: deckIds.length,
        matchCount,
        cardStats: cardMatchMap,
      },
    });
  },
);
