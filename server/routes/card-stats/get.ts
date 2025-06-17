import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { z } from 'zod';
import {
  cardStatMeta,
  cardStatMetaLeader,
  cardStatMetaLeaderBase,
  cardStatTournament,
  cardStatTournamentLeader,
  cardStatTournamentLeaderBase,
} from '../../db/schema/card_stats_schema.ts';
import {
  cardStatTournamentGroup,
  cardStatTournamentGroupLeader,
  cardStatTournamentGroupLeaderBase,
} from '../../db/schema/card_stats_tournament_group_schema.ts';
import { isBasicBase } from '../../../shared/lib/isBasicBase.ts';
import type { CardStatExtended } from '../../../frontend/src/api/card-stats/useCardStats.ts';

// Define query parameters schema
const zCardStatsQueryParams = z
  .object({
    meta_id: z.coerce.number().int().optional(),
    tournament_id: z.string().uuid().optional(),
    tournament_group_id: z.string().uuid().optional(),
    leader_card_id: z.string().optional(),
    base_card_id: z.string().optional(),
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
      // If base_card_id is provided, leader_card_id must also be provided
      return data.base_card_id === undefined || data.leader_card_id !== undefined;
    },
    {
      message: 'leader_card_id must be provided when base_card_id is provided',
      path: ['leader_card_id'],
    },
  );

export const cardStatsGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zCardStatsQueryParams),
  async c => {
    const { meta_id, tournament_id, tournament_group_id, leader_card_id, base_card_id } =
      c.req.valid('query');

    // Determine which tables to query based on the parameters
    let cardStats: CardStatExtended[] = [];

    console.log({ meta_id, tournament_id, tournament_group_id, leader_card_id, base_card_id });

    if (tournament_group_id !== undefined) {
      // Tournament group statistics
      if (leader_card_id && base_card_id) {
        // Filter by leader and base
        cardStats = await db
          .select()
          .from(cardStatTournamentGroupLeaderBase)
          .where(
            and(
              eq(cardStatTournamentGroupLeaderBase.tournamentGroupId, tournament_group_id),
              eq(cardStatTournamentGroupLeaderBase.leaderCardId, leader_card_id),
              eq(cardStatTournamentGroupLeaderBase.baseCardId, base_card_id),
            ),
          );
      } else if (leader_card_id) {
        // Filter by leader only
        cardStats = await db
          .select()
          .from(cardStatTournamentGroupLeader)
          .where(
            and(
              eq(cardStatTournamentGroupLeader.tournamentGroupId, tournament_group_id),
              eq(cardStatTournamentGroupLeader.leaderCardId, leader_card_id),
            ),
          );
      } else {
        // No filters, get all tournament group stats
        cardStats = await db
          .select()
          .from(cardStatTournamentGroup)
          .where(eq(cardStatTournamentGroup.tournamentGroupId, tournament_group_id));
      }
    } else if (meta_id !== undefined) {
      // Meta statistics
      if (leader_card_id && base_card_id) {
        // Filter by leader and base
        cardStats = await db
          .select()
          .from(cardStatMetaLeaderBase)
          .where(
            and(
              eq(cardStatMetaLeaderBase.metaId, meta_id),
              eq(cardStatMetaLeaderBase.leaderCardId, leader_card_id),
              eq(cardStatMetaLeaderBase.baseCardId, base_card_id),
            ),
          );
      } else if (leader_card_id) {
        // Filter by leader only
        cardStats = await db
          .select()
          .from(cardStatMetaLeader)
          .where(
            and(
              eq(cardStatMetaLeader.metaId, meta_id),
              eq(cardStatMetaLeader.leaderCardId, leader_card_id),
            ),
          );
      } else {
        // No filters, get all meta stats
        cardStats = await db.select().from(cardStatMeta).where(eq(cardStatMeta.metaId, meta_id));
      }
    } else if (tournament_id !== undefined) {
      // Tournament statistics
      if (leader_card_id && base_card_id) {
        // Filter by leader and base
        cardStats = await db
          .select()
          .from(cardStatTournamentLeaderBase)
          .where(
            and(
              eq(cardStatTournamentLeaderBase.tournamentId, tournament_id),
              eq(cardStatTournamentLeaderBase.leaderCardId, leader_card_id),
              eq(cardStatTournamentLeaderBase.baseCardId, base_card_id),
            ),
          );
      } else if (leader_card_id) {
        // Filter by leader only
        cardStats = await db
          .select()
          .from(cardStatTournamentLeader)
          .where(
            and(
              eq(cardStatTournamentLeader.tournamentId, tournament_id),
              eq(cardStatTournamentLeader.leaderCardId, leader_card_id),
            ),
          );
      } else {
        // No filters, get all tournament stats
        cardStats = await db
          .select()
          .from(cardStatTournament)
          .where(eq(cardStatTournament.tournamentId, tournament_id));
      }
    }

    return c.json({
      data: cardStats,
    });
  },
);
