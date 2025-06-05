import { db } from '../../db';
import {
  cardStatTournamentGroup,
  cardStatTournamentGroupLeader,
  cardStatTournamentGroupLeaderBase,
} from '../../db/schema/card_stats_tournament_group_schema.ts';
import {
  cardStatTournament,
  cardStatTournamentLeader,
  cardStatTournamentLeaderBase,
} from '../../db/schema/card_stats_schema.ts';
import { eq, sql } from 'drizzle-orm';
import type {
  TournamentGroupCardStat,
  TournamentGroupCardStatLeader,
  TournamentGroupCardStatLeaderBase,
  TournamentGroupStatisticsResult,
  CardStatTournamentGroupInsert,
  CardStatTournamentGroupLeaderInsert,
  CardStatTournamentGroupLeaderBaseInsert,
} from './types.ts';
import { batchArray } from '../utils/batch.ts';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';

/**
 * Fetches tournament IDs for a tournament group
 * @param groupId - ID of the tournament group
 * @returns Array of tournament IDs
 */
export async function fetchTournamentIdsForGroup(groupId: string): Promise<string[]> {
  const result = await db
    .select({ tournamentId: tournamentGroupTournament.tournamentId })
    .from(tournamentGroupTournament)
    .where(eq(tournamentGroupTournament.groupId, groupId));

  return result.map(r => r.tournamentId);
}

/**
 * Computes tournament group statistics by aggregating tournament statistics
 * @param tournamentGroupId - ID of the tournament group
 * @param tournamentIds - Array of tournament IDs
 * @returns Tournament group statistics result
 */
async function computeTournamentGroupStatistics(
  tournamentGroupId: string,
  tournamentIds: string[],
): Promise<TournamentGroupStatisticsResult> {
  // Initialize result objects
  const cardStats: Record<string, TournamentGroupCardStat> = {};
  const cardStatsLeader: Record<string, Record<string, TournamentGroupCardStatLeader>> = {};
  const cardStatsLeaderBase: Record<
    string,
    Record<string, Record<string, TournamentGroupCardStatLeaderBase>>
  > = {};

  // If no tournaments, return empty results
  if (tournamentIds.length === 0) {
    return {
      cardStats: [],
      cardStatsLeader: [],
      cardStatsLeaderBase: [],
    };
  }

  // Fetch tournament card statistics
  const tournamentCardStats = await db
    .select()
    .from(cardStatTournament)
    .where(sql`${cardStatTournament.tournamentId} IN ${tournamentIds}`);

  // Fetch tournament card statistics by leader
  const tournamentCardStatsLeader = await db
    .select()
    .from(cardStatTournamentLeader)
    .where(sql`${cardStatTournamentLeader.tournamentId} IN ${tournamentIds}`);

  // Fetch tournament card statistics by leader and base
  const tournamentCardStatsLeaderBase = await db
    .select()
    .from(cardStatTournamentLeaderBase)
    .where(sql`${cardStatTournamentLeaderBase.tournamentId} IN ${tournamentIds}`);

  // Aggregate card statistics
  for (const stat of tournamentCardStats) {
    const cardId = stat.cardId;

    if (!cardStats[cardId]) {
      cardStats[cardId] = {
        tournamentGroupId,
        cardId,
        countMd: 0,
        countSb: 0,
        deckCount: 0,
        matchWin: 0,
        matchLose: 0,
      };
    }

    cardStats[cardId].countMd += stat.countMd;
    cardStats[cardId].countSb += stat.countSb;
    cardStats[cardId].deckCount += stat.deckCount;
    cardStats[cardId].matchWin += stat.matchWin;
    cardStats[cardId].matchLose += stat.matchLose;
  }

  // Aggregate card statistics by leader
  for (const stat of tournamentCardStatsLeader) {
    const leaderCardId = stat.leaderCardId;
    const cardId = stat.cardId;

    if (!cardStatsLeader[leaderCardId]) {
      cardStatsLeader[leaderCardId] = {};
    }

    if (!cardStatsLeader[leaderCardId][cardId]) {
      cardStatsLeader[leaderCardId][cardId] = {
        tournamentGroupId,
        leaderCardId,
        cardId,
        countMd: 0,
        countSb: 0,
        deckCount: 0,
        matchWin: 0,
        matchLose: 0,
      };
    }

    cardStatsLeader[leaderCardId][cardId].countMd += stat.countMd;
    cardStatsLeader[leaderCardId][cardId].countSb += stat.countSb;
    cardStatsLeader[leaderCardId][cardId].deckCount += stat.deckCount;
    cardStatsLeader[leaderCardId][cardId].matchWin += stat.matchWin;
    cardStatsLeader[leaderCardId][cardId].matchLose += stat.matchLose;
  }

  // Aggregate card statistics by leader and base
  for (const stat of tournamentCardStatsLeaderBase) {
    const leaderCardId = stat.leaderCardId;
    const baseCardId = stat.baseCardId;
    const cardId = stat.cardId;

    if (!cardStatsLeaderBase[leaderCardId]) {
      cardStatsLeaderBase[leaderCardId] = {};
    }

    if (!cardStatsLeaderBase[leaderCardId][baseCardId]) {
      cardStatsLeaderBase[leaderCardId][baseCardId] = {};
    }

    if (!cardStatsLeaderBase[leaderCardId][baseCardId][cardId]) {
      cardStatsLeaderBase[leaderCardId][baseCardId][cardId] = {
        tournamentGroupId,
        leaderCardId,
        baseCardId,
        cardId,
        countMd: 0,
        countSb: 0,
        deckCount: 0,
        matchWin: 0,
        matchLose: 0,
      };
    }

    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].countMd += stat.countMd;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].countSb += stat.countSb;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].deckCount += stat.deckCount;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].matchWin += stat.matchWin;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].matchLose += stat.matchLose;
  }

  // Convert record objects to arrays
  return {
    cardStats: Object.values(cardStats),
    cardStatsLeader: Object.values(cardStatsLeader).flatMap(leader => Object.values(leader)),
    cardStatsLeaderBase: Object.values(cardStatsLeaderBase).flatMap(leader =>
      Object.values(leader).flatMap(base => Object.values(base)),
    ),
  };
}

/**
 * Saves tournament group statistics to the database
 * @param statistics - Tournament group statistics result
 * @param groupId - ID of the tournament group
 */
async function saveTournamentGroupStatistics(
  statistics: TournamentGroupStatisticsResult,
  groupId: string,
) {
  const { cardStats, cardStatsLeader, cardStatsLeaderBase } = statistics;
  const BATCH_SIZE = 5000; // Adjust this value based on your database's capabilities

  // Begin transaction
  await db.transaction(async tx => {
    // Truncate existing data
    await tx
      .delete(cardStatTournamentGroup)
      .where(eq(cardStatTournamentGroup.tournamentGroupId, groupId));
    await tx
      .delete(cardStatTournamentGroupLeader)
      .where(eq(cardStatTournamentGroupLeader.tournamentGroupId, groupId));
    await tx
      .delete(cardStatTournamentGroupLeaderBase)
      .where(eq(cardStatTournamentGroupLeaderBase.tournamentGroupId, groupId));

    if (cardStats.length > 0) {
      // Insert new data in batches
      const cardStatsBatches = batchArray(cardStats as CardStatTournamentGroupInsert[], BATCH_SIZE);
      for (const batch of cardStatsBatches) {
        await tx.insert(cardStatTournamentGroup).values(batch);
      }
    }

    if (cardStatsLeader.length > 0) {
      const cardStatsLeaderBatches = batchArray(
        cardStatsLeader as CardStatTournamentGroupLeaderInsert[],
        BATCH_SIZE,
      );
      for (const batch of cardStatsLeaderBatches) {
        await tx.insert(cardStatTournamentGroupLeader).values(batch);
      }
    }

    if (cardStatsLeaderBase.length > 0) {
      const cardStatsLeaderBaseBatches = batchArray(
        cardStatsLeaderBase as CardStatTournamentGroupLeaderBaseInsert[],
        BATCH_SIZE,
      );
      for (const batch of cardStatsLeaderBaseBatches) {
        await tx.insert(cardStatTournamentGroupLeaderBase).values(batch);
      }
    }
  });
}

/**
 * Computes and saves tournament group statistics
 * @param groupId - ID of the tournament group
 * @returns Tournament group statistics result
 */
export async function computeAndSaveTournamentGroupStatistics(
  groupId: string,
): Promise<TournamentGroupStatisticsResult> {
  // Fetch tournament IDs for the tournament group
  const tournamentIds = await fetchTournamentIdsForGroup(groupId);

  // Compute statistics
  const statistics = await computeTournamentGroupStatistics(groupId, tournamentIds);

  // Save statistics to database
  await saveTournamentGroupStatistics(statistics, groupId);

  return statistics;
}

/**
 * Computes tournament group statistics without saving to database
 * @param groupId - ID of the tournament group
 * @returns Tournament group statistics result
 */
export async function computeTournamentGroupStatisticsOnly(
  groupId: string,
): Promise<TournamentGroupStatisticsResult> {
  // Fetch tournament IDs for the tournament group
  const tournamentIds = await fetchTournamentIdsForGroup(groupId);

  // Compute statistics
  return computeTournamentGroupStatistics(groupId, tournamentIds);
}
