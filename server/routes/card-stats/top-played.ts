import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
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

// Define query parameters schema
const zTopPlayedCardsQueryParams = z
  .object({
    meta_id: z.coerce.number().int().optional(),
    tournament_id: z.string().uuid().optional(),
    leader_ids: z
      .string()
      .optional()
      .transform(val => (val ? val.split(',') : undefined)),
    leader_base_pairs: z
      .string()
      .optional()
      .transform(val => {
        if (!val) return undefined;
        return val.split(',').map(pair => {
          const [leaderId, baseId] = pair.split(':');
          return { leaderId, baseId };
        });
      }),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .refine(
    data => {
      // Either meta_id or tournament_id must be provided
      return data.meta_id !== undefined || data.tournament_id !== undefined;
    },
    {
      message: 'Either meta_id or tournament_id must be provided',
      path: ['meta_id', 'tournament_id'],
    },
  );

export const cardStatsTopPlayedRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zTopPlayedCardsQueryParams),
  async c => {
    const { meta_id, tournament_id, leader_ids, leader_base_pairs, limit } = c.req.valid('query');

    // Results will be grouped by leader or leader/base combination
    const result: Record<string, any> = {};

    if (meta_id !== undefined) {
      // Meta statistics
      if (leader_base_pairs && leader_base_pairs.length > 0) {
        // Process each leader and base combination separately
        for (const pair of leader_base_pairs) {
          const { leaderId, baseId } = pair;
          const key = `${leaderId}|${baseId}`;

          // Get top cards for this specific leader/base combination
          const cards = await db
            .select({
              cardId: cardStatMetaLeaderBase.cardId,
              leaderCardId: cardStatMetaLeaderBase.leaderCardId,
              baseCardId: cardStatMetaLeaderBase.baseCardId,
              countMd: cardStatMetaLeaderBase.countMd,
              countSb: cardStatMetaLeaderBase.countSb,
              totalCount: sql`${cardStatMetaLeaderBase.countMd} + ${cardStatMetaLeaderBase.countSb}`,
              deckCount: cardStatMetaLeaderBase.deckCount,
              matchWin: cardStatMetaLeaderBase.matchWin,
              matchLose: cardStatMetaLeaderBase.matchLose,
            })
            .from(cardStatMetaLeaderBase)
            .where(
              and(
                eq(cardStatMetaLeaderBase.metaId, meta_id),
                eq(cardStatMetaLeaderBase.leaderCardId, leaderId),
                eq(cardStatMetaLeaderBase.baseCardId, baseId),
              ),
            )
            .orderBy(
              sql`${cardStatMetaLeaderBase.countMd} + ${cardStatMetaLeaderBase.countSb} desc`,
            )
            .limit(limit);

          result[key] = cards;
        }
      } else if (leader_ids && leader_ids.length > 0) {
        // Process each leader ID separately
        for (const leaderId of leader_ids) {
          // Get top cards for this specific leader
          const cards = await db
            .select({
              cardId: cardStatMetaLeader.cardId,
              leaderCardId: cardStatMetaLeader.leaderCardId,
              countMd: cardStatMetaLeader.countMd,
              countSb: cardStatMetaLeader.countSb,
              totalCount: sql`${cardStatMetaLeader.countMd} + ${cardStatMetaLeader.countSb}`,
              deckCount: cardStatMetaLeader.deckCount,
              matchWin: cardStatMetaLeader.matchWin,
              matchLose: cardStatMetaLeader.matchLose,
            })
            .from(cardStatMetaLeader)
            .where(
              and(
                eq(cardStatMetaLeader.metaId, meta_id),
                eq(cardStatMetaLeader.leaderCardId, leaderId),
              ),
            )
            .orderBy(sql`${cardStatMetaLeader.countMd} + ${cardStatMetaLeader.countSb} desc`)
            .limit(limit);

          result[leaderId] = cards;
        }
      } else {
        // No filters, get top played cards from meta
        const cards = await db
          .select({
            cardId: cardStatMeta.cardId,
            countMd: cardStatMeta.countMd,
            countSb: cardStatMeta.countSb,
            totalCount: sql`${cardStatMeta.countMd} + ${cardStatMeta.countSb}`,
            deckCount: cardStatMeta.deckCount,
            matchWin: cardStatMeta.matchWin,
            matchLose: cardStatMeta.matchLose,
          })
          .from(cardStatMeta)
          .where(eq(cardStatMeta.metaId, meta_id))
          .orderBy(sql`${cardStatMeta.countMd} + ${cardStatMeta.countSb} desc`)
          .limit(limit);

        result['all'] = cards;
      }
    } else if (tournament_id !== undefined) {
      // Tournament statistics
      if (leader_base_pairs && leader_base_pairs.length > 0) {
        // Process each leader and base combination separately
        for (const pair of leader_base_pairs) {
          const { leaderId, baseId } = pair;
          const key = `${leaderId}|${baseId}`;

          // Get top cards for this specific leader/base combination
          const cards = await db
            .select({
              cardId: cardStatTournamentLeaderBase.cardId,
              leaderCardId: cardStatTournamentLeaderBase.leaderCardId,
              baseCardId: cardStatTournamentLeaderBase.baseCardId,
              countMd: cardStatTournamentLeaderBase.countMd,
              countSb: cardStatTournamentLeaderBase.countSb,
              totalCount: sql`${cardStatTournamentLeaderBase.countMd} + ${cardStatTournamentLeaderBase.countSb}`,
              deckCount: cardStatTournamentLeaderBase.deckCount,
              matchWin: cardStatTournamentLeaderBase.matchWin,
              matchLose: cardStatTournamentLeaderBase.matchLose,
            })
            .from(cardStatTournamentLeaderBase)
            .where(
              and(
                eq(cardStatTournamentLeaderBase.tournamentId, tournament_id),
                eq(cardStatTournamentLeaderBase.leaderCardId, leaderId),
                eq(cardStatTournamentLeaderBase.baseCardId, baseId),
              ),
            )
            .orderBy(
              sql`${cardStatTournamentLeaderBase.countMd} + ${cardStatTournamentLeaderBase.countSb} desc`,
            )
            .limit(limit);

          result[key] = cards;
        }
      } else if (leader_ids && leader_ids.length > 0) {
        // Process each leader ID separately
        for (const leaderId of leader_ids) {
          // Get top cards for this specific leader
          const cards = await db
            .select({
              cardId: cardStatTournamentLeader.cardId,
              leaderCardId: cardStatTournamentLeader.leaderCardId,
              countMd: cardStatTournamentLeader.countMd,
              countSb: cardStatTournamentLeader.countSb,
              totalCount: sql`${cardStatTournamentLeader.countMd} + ${cardStatTournamentLeader.countSb}`,
              deckCount: cardStatTournamentLeader.deckCount,
              matchWin: cardStatTournamentLeader.matchWin,
              matchLose: cardStatTournamentLeader.matchLose,
            })
            .from(cardStatTournamentLeader)
            .where(
              and(
                eq(cardStatTournamentLeader.tournamentId, tournament_id),
                eq(cardStatTournamentLeader.leaderCardId, leaderId),
              ),
            )
            .orderBy(
              sql`${cardStatTournamentLeader.countMd} + ${cardStatTournamentLeader.countSb} desc`,
            )
            .limit(limit);

          result[leaderId] = cards;
        }
      } else {
        // No filters, get top played cards from tournament
        const cards = await db
          .select({
            cardId: cardStatTournament.cardId,
            countMd: cardStatTournament.countMd,
            countSb: cardStatTournament.countSb,
            totalCount: sql`${cardStatTournament.countMd} + ${cardStatTournament.countSb}`,
            deckCount: cardStatTournament.deckCount,
            matchWin: cardStatTournament.matchWin,
            matchLose: cardStatTournament.matchLose,
          })
          .from(cardStatTournament)
          .where(eq(cardStatTournament.tournamentId, tournament_id))
          .orderBy(sql`${cardStatTournament.countMd} + ${cardStatTournament.countSb} desc`)
          .limit(limit);

        result['all'] = cards;
      }
    }

    return c.json({
      data: result,
    });
  },
);
