import { db } from '../../db';
import {
  cardStatMeta,
  cardStatMetaLeader,
  cardStatMetaLeaderBase,
  cardStatTournament,
  cardStatTournamentLeader,
  cardStatTournamentLeaderBase,
} from '../../db/schema/card_stats_schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { eq, sql } from 'drizzle-orm';
import type { CardStat } from './types.ts';
import { batchArray } from '../utils/batch.ts';

/**
 * Interface for meta card statistics data
 */
interface MetaCardStat extends CardStat {
  metaId: number;
}

/**
 * Interface for meta card statistics with leader data
 */
interface MetaCardStatLeader extends MetaCardStat {
  leaderCardId: string;
}

/**
 * Interface for meta card statistics with leader and base data
 */
interface MetaCardStatLeaderBase extends MetaCardStatLeader {
  baseCardId: string;
}

/**
 * Interface for meta statistics computation result
 */
interface MetaStatisticsResult {
  cardStats: MetaCardStat[];
  cardStatsLeader: MetaCardStatLeader[];
  cardStatsLeaderBase: MetaCardStatLeaderBase[];
}

/**
 * Fetches tournament IDs for a given meta
 * @param metaId - ID of the meta
 * @returns Array of tournament IDs
 */
async function fetchTournamentIdsForMeta(metaId: number): Promise<string[]> {
  const tournaments = await db
    .select({ id: tournament.id })
    .from(tournament)
    .where(eq(tournament.meta, metaId));

  return tournaments.map(t => t.id);
}

/**
 * Computes meta statistics by aggregating tournament statistics
 * @param metaId - ID of the meta
 * @param tournamentIds - Array of tournament IDs
 * @returns Meta statistics result
 */
async function computeMetaStatistics(
  metaId: number,
  tournamentIds: string[],
): Promise<MetaStatisticsResult> {
  // Initialize result objects
  const cardStats: Record<string, MetaCardStat> = {};
  const cardStatsLeader: Record<string, Record<string, MetaCardStatLeader>> = {};
  const cardStatsLeaderBase: Record<
    string,
    Record<string, Record<string, MetaCardStatLeaderBase>>
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
        metaId,
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
        metaId,
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
        metaId,
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
 * Saves meta statistics to the database
 * @param statistics - Meta statistics result
 * @param metaId
 */
async function saveMetaStatistics(statistics: MetaStatisticsResult, metaId: number) {
  const { cardStats, cardStatsLeader, cardStatsLeaderBase } = statistics;
  const BATCH_SIZE = 5000; // Adjust this value based on your database's capabilities

  // Begin transaction
  await db.transaction(async tx => {
    // Truncate existing data
    await tx.delete(cardStatMeta).where(eq(cardStatMeta.metaId, metaId));
    await tx.delete(cardStatMetaLeader).where(eq(cardStatMetaLeader.metaId, metaId));
    await tx.delete(cardStatMetaLeaderBase).where(eq(cardStatMetaLeaderBase.metaId, metaId));

    if (cardStats.length > 0) {
      // Insert new data in batches
      const cardStatsBatches = batchArray(cardStats, BATCH_SIZE);
      for (const batch of cardStatsBatches) {
        await tx.insert(cardStatMeta).values(batch);
      }
    }

    if (cardStatsLeader.length > 0) {
      const cardStatsLeaderBatches = batchArray(cardStatsLeader, BATCH_SIZE);
      for (const batch of cardStatsLeaderBatches) {
        await tx.insert(cardStatMetaLeader).values(batch);
      }
    }

    if (cardStatsLeaderBase.length > 0) {
      const cardStatsLeaderBaseBatches = batchArray(cardStatsLeaderBase, BATCH_SIZE);
      for (const batch of cardStatsLeaderBaseBatches) {
        await tx.insert(cardStatMetaLeaderBase).values(batch);
      }
    }
  });
}

/**
 * Computes and saves meta statistics
 * @param metaId - ID of the meta
 * @returns Meta statistics result
 */
export async function computeAndSaveMetaStatistics(metaId: number): Promise<MetaStatisticsResult> {
  // Fetch tournament IDs for the meta
  const tournamentIds = await fetchTournamentIdsForMeta(metaId);

  // Compute statistics
  const statistics = await computeMetaStatistics(metaId, tournamentIds);

  // Save statistics to database
  await saveMetaStatistics(statistics, metaId);

  return statistics;
}

/**
 * Computes meta statistics without saving to database
 * @param metaId - ID of the meta
 * @returns Meta statistics result
 */
export async function computeMetaStatisticsOnly(metaId: number): Promise<MetaStatisticsResult> {
  // Fetch tournament IDs for the meta
  const tournamentIds = await fetchTournamentIdsForMeta(metaId);

  // Compute statistics
  return computeMetaStatistics(metaId, tournamentIds);
}
