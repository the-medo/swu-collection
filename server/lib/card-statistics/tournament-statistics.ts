import { db } from '../../db';
import {
  cardStatTournament,
  cardStatTournamentLeader,
  cardStatTournamentLeaderBase,
} from '../../db/schema/card_stats_schema.ts';
import { type TournamentDeck, tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { type Deck, deck } from '../../db/schema/deck.ts';
import { type DeckCard, deckCard } from '../../db/schema/deck_card.ts';
import { eq, and, sql } from 'drizzle-orm';
import type {
  TournamentStatisticsResult,
  TournamentCardStat,
  TournamentCardStatLeader,
  TournamentCardStatLeaderBase,
  CardStatTournamentInsert,
  CardStatTournamentLeaderInsert,
  CardStatTournamentLeaderBaseInsert,
} from './types.ts';
import { isBasicBase } from '../../../shared/lib/isBasicBase.ts';
import { cardList } from '../../db/lists.ts';
import { batchArray } from '../utils/batch.ts';

/**
 * Fetches all data needed for tournament statistics computation
 * @param tournamentId - ID of the tournament
 * @returns Object containing tournament decks, decks, and deck cards
 */
async function fetchTournamentData(tournamentId: string) {
  // Get tournament decks
  const tournamentDecks = await db
    .select()
    .from(tournamentDeck)
    .where(eq(tournamentDeck.tournamentId, tournamentId));

  if (tournamentDecks.length === 0) {
    return { tournamentDecks: [], decks: [], deckCards: [] };
  }

  // Get deck IDs
  const deckIds = tournamentDecks.map(td => td.deckId);

  // Get decks
  const decks = await db
    .select()
    .from(deck)
    .where(sql`${deck.id} IN ${deckIds}`);

  // Get deck cards
  const deckCards = await db
    .select()
    .from(deckCard)
    .where(sql`${deckCard.deckId} IN ${deckIds}`);

  return { tournamentDecks, decks, deckCards };
}

/**
 * Computes tournament statistics from tournament data
 * @param tournamentId - ID of the tournament
 * @param tournamentDecks - Tournament decks data
 * @param decks - Decks data
 * @param deckCards - Deck cards data
 * @returns Tournament statistics result
 */
function computeTournamentStatistics(
  tournamentId: string,
  tournamentDecks: TournamentDeck[],
  decks: Deck[],
  deckCards: DeckCard[],
): TournamentStatisticsResult {
  // Initialize result objects
  const cardStats: Record<string, TournamentCardStat> = {};
  const cardStatsLeader: Record<string, Record<string, TournamentCardStatLeader>> = {};
  const cardStatsLeaderBase: Record<
    string,
    Record<string, Record<string, TournamentCardStatLeaderBase>>
  > = {};

  // Create a map of deck ID to tournament deck for easy lookup
  const deckToTournamentDeck = new Map(tournamentDecks.map(td => [td.deckId, td]));

  // Create a map of deck ID to deck for easy lookup
  const deckMap = new Map(decks.map(d => [d.id, d]));

  // we don't want to add 2 to deck count when the card is in one deck - both in maindeck and sideboard
  const deckCardsAdded: Record<string, Record<string, boolean> | undefined> = {};

  // Process each deck card
  for (const card of deckCards) {
    const deckId = card.deckId;
    const tournamentDeckData = deckToTournamentDeck.get(deckId);
    const deckData = deckMap.get(deckId);

    if (!tournamentDeckData || !deckData) continue; // Skip if tournament deck or deck data is not found
    if (!deckData.leaderCardId1 || !deckData.baseCardId) continue; // Skip if leader or base is null (invalid deck)
    if (card.board !== 1 && card.board !== 2) continue; // Skip if board is not 1 (maindeck) or 2 (sideboard)

    if (!deckCardsAdded[deckId]) deckCardsAdded[deckId] = {};

    const cardId = card.cardId;
    const leaderCardId = deckData.leaderCardId1;
    let baseCardId = deckData.baseCardId;
    const addToDeckCount = deckCardsAdded[deckId][cardId] ? 0 : 1;

    const baseCard = cardList[baseCardId];
    if (!baseCard) continue; // Skip if base card was not found for some reason

    // In case of "basic" bases, we want to save it as the aspect of the base...
    // ...just careful later, because all aspect names also have corresponding normal cards
    if (isBasicBase(baseCard)) {
      baseCardId = baseCard.aspects[0];
    }

    const isMd = card.board === 1;
    const quantity = card.quantity;
    const matchWin = tournamentDeckData.recordWin;
    const matchLose = tournamentDeckData.recordLose;
    const countMd = isMd ? quantity : 0;
    const countSb = !isMd ? quantity : 0;
    const countTotal = countMd + countSb;

    // Update card stats
    if (!cardStats[cardId]) {
      cardStats[cardId] = {
        tournamentId,
        cardId,
        countMd: 0,
        countSb: 0,
        deckCount: 0,
        matchWin: 0,
        matchLose: 0,
      };
    }

    cardStats[cardId].countMd += countMd;
    cardStats[cardId].countSb += countSb;
    cardStats[cardId].deckCount += addToDeckCount;
    cardStats[cardId].matchWin += matchWin * countTotal;
    cardStats[cardId].matchLose += matchLose * countTotal;

    // Update card stats by leader
    if (!cardStatsLeader[leaderCardId]) {
      cardStatsLeader[leaderCardId] = {};
    }
    if (!cardStatsLeader[leaderCardId][cardId]) {
      cardStatsLeader[leaderCardId][cardId] = {
        tournamentId,
        leaderCardId,
        cardId,
        countMd: 0,
        countSb: 0,
        deckCount: 0,
        matchWin: 0,
        matchLose: 0,
      };
    }
    cardStatsLeader[leaderCardId][cardId].countMd += countMd;
    cardStatsLeader[leaderCardId][cardId].countSb += countSb;
    cardStatsLeader[leaderCardId][cardId].deckCount += addToDeckCount;
    cardStatsLeader[leaderCardId][cardId].matchWin += matchWin * countTotal;
    cardStatsLeader[leaderCardId][cardId].matchLose += matchLose * countTotal;

    // Update card stats by leader and base
    if (!cardStatsLeaderBase[leaderCardId]) {
      cardStatsLeaderBase[leaderCardId] = {};
    }
    if (!cardStatsLeaderBase[leaderCardId][baseCardId]) {
      cardStatsLeaderBase[leaderCardId][baseCardId] = {};
    }
    if (!cardStatsLeaderBase[leaderCardId][baseCardId][cardId]) {
      cardStatsLeaderBase[leaderCardId][baseCardId][cardId] = {
        tournamentId,
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
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].countMd += countMd;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].countSb += countSb;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].deckCount += addToDeckCount;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].matchWin += matchWin * countTotal;
    cardStatsLeaderBase[leaderCardId][baseCardId][cardId].matchLose += matchLose * countTotal;

    deckCardsAdded[deckId][cardId] = true;
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
 * Saves tournament statistics to the database
 * @param statistics - Tournament statistics result
 * @param tournamentId
 */
async function saveTournamentStatistics(
  statistics: TournamentStatisticsResult,
  tournamentId: string,
) {
  const { cardStats, cardStatsLeader, cardStatsLeaderBase } = statistics;
  const BATCH_SIZE = 5000; // Adjust this value based on your database's capabilities

  // Begin transaction
  await db.transaction(async tx => {
    // Truncate existing data
    await tx.delete(cardStatTournament).where(eq(cardStatTournament.tournamentId, tournamentId));
    await tx
      .delete(cardStatTournamentLeader)
      .where(eq(cardStatTournamentLeader.tournamentId, tournamentId));
    await tx
      .delete(cardStatTournamentLeaderBase)
      .where(eq(cardStatTournamentLeaderBase.tournamentId, tournamentId));

    // Insert new data in batches
    if (cardStats.length > 0) {
      const cardStatsBatches = batchArray(cardStats as CardStatTournamentInsert[], BATCH_SIZE);
      for (const batch of cardStatsBatches) {
        await tx.insert(cardStatTournament).values(batch);
      }
    }

    if (cardStatsLeader.length > 0) {
      const cardStatsLeaderBatches = batchArray(
        cardStatsLeader as CardStatTournamentLeaderInsert[],
        BATCH_SIZE,
      );
      for (const batch of cardStatsLeaderBatches) {
        await tx.insert(cardStatTournamentLeader).values(batch);
      }
    }

    if (cardStatsLeaderBase.length > 0) {
      const cardStatsLeaderBaseBatches = batchArray(
        cardStatsLeaderBase as CardStatTournamentLeaderBaseInsert[],
        BATCH_SIZE,
      );
      for (const batch of cardStatsLeaderBaseBatches) {
        await tx.insert(cardStatTournamentLeaderBase).values(batch);
      }
    }
  });
}

/**
 * Computes and saves tournament statistics
 * @param tournamentId - ID of the tournament
 * @returns Tournament statistics result
 */
export async function computeAndSaveTournamentStatistics(
  tournamentId: string,
): Promise<TournamentStatisticsResult> {
  // Fetch tournament data
  const { tournamentDecks, decks, deckCards } = await fetchTournamentData(tournamentId);

  // Compute statistics
  const statistics = computeTournamentStatistics(tournamentId, tournamentDecks, decks, deckCards);

  // Save statistics to database
  await saveTournamentStatistics(statistics, tournamentId);

  return statistics;
}

/**
 * Computes tournament statistics without saving to database
 * @param tournamentId - ID of the tournament
 * @returns Tournament statistics result
 */
export async function computeTournamentStatisticsOnly(
  tournamentId: string,
): Promise<TournamentStatisticsResult> {
  // Fetch tournament data
  const { tournamentDecks, decks, deckCards } = await fetchTournamentData(tournamentId);

  // Compute statistics
  return computeTournamentStatistics(tournamentId, tournamentDecks, decks, deckCards);
}
