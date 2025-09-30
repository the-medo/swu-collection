import { db } from '../../../db';
import {
  cardStatMatchupDecks,
  cardStatMatchupInfo,
} from '../../../db/schema/card_stat_matchup_schema.ts';
import { and, eq } from 'drizzle-orm';
import { deck } from '../../../db/schema/deck.ts';
import { deckInformation } from '../../../db/schema/deck_information.ts';
import { getSpecialBaseName } from '../../../../shared/lib/basicBases.ts';
import { tournamentMatch } from '../../../db/schema/tournament_match.ts';
import { deckCard } from '../../../db/schema/deck_card.ts';
import { compressMatchupInfo } from './utils.ts';
import type { CardMatchupStat } from './types.ts';

const BOTH_TOGETHER = 'both-decks-together';
const BOTH_DIVIDED = 'both-decks-divided';

/**
 * Helper function to update card statistics by adding values from source to target
 */
function updateCardStats(target: CardMatchupStat, source: CardMatchupStat): void {
  target.total += source.total;
  target.gameWins += source.gameWins;
  target.gameLosses += source.gameLosses;
  target.gameDraws += source.gameDraws;
  target.matchWins += source.matchWins;
  target.matchLosses += source.matchLosses;
  target.matchDraws += source.matchDraws;
}

export type CardMatchMapKey = 1 | 2 | 'both-decks-together' | 'both-decks-divided';

type CardMatchMap = Record<
  string, // cardId
  Record<
    CardMatchMapKey,
    | Record<
        number | string, // count (in form of number or combination like "1+2"
        CardMatchupStat
      >
    | undefined
  >
>;
type CardDeckMap = Record<
  string, // cardId
  Record<
    CardMatchMapKey,
    | Record<
        number | string, // count (in form of number or combination like "1+2"
        number[]
      >
    | undefined
  >
>;

export async function getRelevantMatches(
  overviewId: string,
  leaderId2?: string,
  baseId2?: string,
): Promise<{ matchCount: number; cardMatchMap: CardMatchMap }> {
  // Check if baseId corresponds to a special base name
  const base2SpecialName = getSpecialBaseName(baseId2);

  // Build the base query with all necessary joins
  let query1 = db
    .select({
      deckId: cardStatMatchupDecks.deckId,
      matchId: tournamentMatch.id,
      gameWin: tournamentMatch.gameWin,
      gameLose: tournamentMatch.gameLose,
      gameDraw: tournamentMatch.gameDraw,
      result: tournamentMatch.result,
    })
    .from(cardStatMatchupDecks)
    .innerJoin(tournamentMatch, eq(tournamentMatch.p1DeckId, cardStatMatchupDecks.deckId))
    .innerJoin(deck, eq(deck.id, tournamentMatch.p2DeckId))
    .$dynamic();

  // Build second query, thats connected to p2DeckId
  let query2 = db
    .select({
      deckId: cardStatMatchupDecks.deckId,
      matchId: tournamentMatch.id,
      gameWin: tournamentMatch.gameWin,
      gameLose: tournamentMatch.gameLose,
      gameDraw: tournamentMatch.gameDraw,
      result: tournamentMatch.result,
    })
    .from(cardStatMatchupDecks)
    .innerJoin(tournamentMatch, eq(tournamentMatch.p2DeckId, cardStatMatchupDecks.deckId))
    .innerJoin(deck, eq(deck.id, tournamentMatch.p1DeckId))
    .$dynamic();

  if (base2SpecialName) {
    const leaderBaseConditions = and(
      leaderId2 ? eq(deck.leaderCardId1, leaderId2) : undefined,
      eq(deckInformation.baseSpecialName, base2SpecialName),
      eq(cardStatMatchupDecks.id, overviewId),
    );
    query1 = query1
      .innerJoin(deckInformation, eq(tournamentMatch.p2DeckId, deckInformation.deckId))
      .where(leaderBaseConditions);
    query2 = query2
      .innerJoin(deckInformation, eq(tournamentMatch.p1DeckId, deckInformation.deckId))
      .where(leaderBaseConditions);
  } else {
    const leaderBaseConditions = and(
      leaderId2 ? eq(deck.leaderCardId1, leaderId2) : undefined,
      baseId2 ? eq(deck.baseCardId, baseId2) : undefined,
      eq(cardStatMatchupDecks.id, overviewId),
    );
    query1 = query1.where(leaderBaseConditions);
    query2 = query2.where(leaderBaseConditions);
  }

  // Execute the query
  const matches1 = await query1;
  const matches2 = await query2;

  const emptyObject = {
    total: 0,
    gameWins: 0,
    gameLosses: 0,
    gameDraws: 0,
    matchWins: 0,
    matchLosses: 0,
    matchDraws: 0,
  };

  const deckMatchMap: Record<string, CardMatchupStat | undefined> = {};
  let deckNumberId = 1;
  const deckIntegerMap: Record<string, number | undefined> = {};
  const deckMatches: Record<number, string[] | undefined> = {};

  const matchCount = matches1.length + matches2.length;

  for (const match of matches1) {
    const { deckId, matchId } = match;
    if (!deckMatchMap[deckId]) {
      deckMatchMap[deckId] = {
        ...emptyObject,
      };
    }
    if (!deckIntegerMap[deckId]) {
      deckIntegerMap[deckId] = deckNumberId;
      deckNumberId++;
    }
    if (!deckMatches[deckIntegerMap[deckId]]) deckMatches[deckIntegerMap[deckId]] = [];
    deckMatches[deckIntegerMap[deckId]]!.push(matchId);

    deckMatchMap[deckId].total++;
    deckMatchMap[deckId].gameWins += match.gameWin;
    deckMatchMap[deckId].gameLosses += match.gameLose;
    deckMatchMap[deckId].gameDraws += match.gameDraw;
    deckMatchMap[deckId].matchWins += match.result === 3 ? 1 : 0;
    deckMatchMap[deckId].matchLosses += match.result === 0 ? 1 : 0;
    deckMatchMap[deckId].matchDraws += match.result === 1 ? 1 : 0;
  }

  for (const match of matches2) {
    const { deckId, matchId } = match;
    // console.log({ deckId, match });
    if (!deckMatchMap[deckId]) {
      deckMatchMap[deckId] = {
        ...emptyObject,
      };
    }
    if (!deckIntegerMap[deckId]) {
      deckIntegerMap[deckId] = deckNumberId;
      deckNumberId++;
    }
    if (!deckMatches[deckIntegerMap[deckId]]) deckMatches[deckIntegerMap[deckId]] = [];
    deckMatches[deckIntegerMap[deckId]]!.push(matchId);

    // here, the wins and losses are swapped, because it is taken from different perspective
    // (match has data from view of player 1, but now we are looking at player 2)
    deckMatchMap[deckId].total++;
    deckMatchMap[deckId].gameWins += match.gameLose;
    deckMatchMap[deckId].gameLosses += match.gameWin;
    deckMatchMap[deckId].gameDraws += match.gameDraw;
    deckMatchMap[deckId].matchWins += match.result === 0 ? 1 : 0;
    deckMatchMap[deckId].matchLosses += match.result === 3 ? 1 : 0;
    deckMatchMap[deckId].matchDraws += match.result === 1 ? 1 : 0;
  }

  if (Object.keys(deckMatchMap).length === 0) return { matchCount, cardMatchMap: {} };

  // Fetch all cards for decks in the cardStatMatchupDecks table
  const deckCards = await db
    .select({
      deckId: deckCard.deckId,
      cardId: deckCard.cardId,
      board: deckCard.board,
      quantity: deckCard.quantity,
    })
    .from(deckCard)
    .innerJoin(cardStatMatchupDecks, eq(deckCard.deckId, cardStatMatchupDecks.deckId))
    .where(eq(cardStatMatchupDecks.id, overviewId));

  // Create a map to track card statistics by card ID, board, and count
  const cardMatchMap: CardMatchMap = {};
  const cardDeckMap: CardDeckMap = {};

  // Initialize the cardMatchMap with all cards and possible counts (0 to max quantity found)
  const allCardIds = new Set<string>();
  // Create a map of deck cards for easier lookup
  const deckCardMap: Record<string, Record<string, Record<number, number>>> = {};

  // First pass: collect all unique card IDs, boards, and find max quantities
  for (const card of deckCards) {
    const { deckId, cardId, board, quantity } = card;

    // Track all unique card IDs
    allCardIds.add(cardId);

    if (!cardMatchMap[cardId]) {
      cardMatchMap[cardId] = {
        1: {
          0: { ...emptyObject },
        },
        2: {
          0: { ...emptyObject },
        },
        [BOTH_TOGETHER]: undefined,
        [BOTH_DIVIDED]: undefined,
      };
    }
    if (!cardDeckMap[cardId]) {
      cardDeckMap[cardId] = {
        1: {},
        2: {},
        [BOTH_TOGETHER]: {},
        [BOTH_DIVIDED]: {},
      };
    }

    if (!deckCardMap[deckId]) {
      deckCardMap[deckId] = {};
    }
    if (!deckCardMap[deckId][cardId]) {
      deckCardMap[deckId][cardId] = {};
    }

    deckCardMap[deckId][cardId][board] = quantity;
  }

  for (const cardId of allCardIds) {
    for (const deckId of Object.keys(deckCardMap)) {
      // Only use decks that are present in deckMatchMap
      const deckStats = deckMatchMap[deckId];
      if (!deckStats) continue;

      ([1, 2] as CardMatchMapKey[]).forEach(board => {
        // Determine the count of this card in this deck and board
        const count = deckCardMap[deckId]?.[cardId]?.[board as number] || 0;

        if (cardMatchMap[cardId]?.[board] === undefined) cardMatchMap[cardId][board] = {};
        const cardMatch = cardMatchMap[cardId][board];
        if (cardMatch[count] === undefined) {
          cardMatch[count] = { ...emptyObject };
        }

        if (cardDeckMap[cardId]?.[board] === undefined) cardDeckMap[cardId][board] = {};
        const cardDeck = cardDeckMap[cardId][board];
        if (cardDeck[count] === undefined) {
          cardDeck[count] = [];
        }

        // Update statistics for this card, board, and count
        updateCardStats(cardMatch[count], deckStats);
        cardDeck[count].push(deckIntegerMap[deckId]!);
      });

      const count1 = deckCardMap[deckId]?.[cardId]?.[1] || 0;
      const count2 = deckCardMap[deckId]?.[cardId]?.[2] || 0;
      const countTotal = count1 + count2;
      const countTotalString = `${count1}+${count2}`;

      // init non-existing objects
      if (cardMatchMap[cardId]?.[BOTH_TOGETHER] === undefined) {
        cardMatchMap[cardId][BOTH_TOGETHER] = {
          0: { ...emptyObject },
        };
      }
      if (cardDeckMap[cardId]?.[BOTH_TOGETHER] === undefined) {
        cardDeckMap[cardId][BOTH_TOGETHER] = {
          0: [],
        };
      }
      if (cardMatchMap[cardId]?.[BOTH_DIVIDED] === undefined) {
        cardMatchMap[cardId][BOTH_DIVIDED] = {
          '0+0': { ...emptyObject },
        };
      }
      if (cardDeckMap[cardId]?.[BOTH_DIVIDED] === undefined) {
        cardDeckMap[cardId][BOTH_DIVIDED] = {
          '0+0': [],
        };
      }

      // init non-existing sub-objects
      if (cardMatchMap[cardId][BOTH_TOGETHER][countTotal] === undefined) {
        cardMatchMap[cardId][BOTH_TOGETHER][countTotal] = { ...emptyObject };
      }
      if (cardDeckMap[cardId][BOTH_TOGETHER][countTotal] === undefined) {
        cardDeckMap[cardId][BOTH_TOGETHER][countTotal] = [];
      }
      if (cardMatchMap[cardId][BOTH_DIVIDED][countTotalString] === undefined) {
        cardMatchMap[cardId][BOTH_DIVIDED][countTotalString] = { ...emptyObject };
      }
      if (cardDeckMap[cardId][BOTH_DIVIDED][countTotalString] === undefined) {
        cardDeckMap[cardId][BOTH_DIVIDED][countTotalString] = [];
      }

      updateCardStats(cardMatchMap[cardId][BOTH_TOGETHER][countTotal], deckStats);
      updateCardStats(cardMatchMap[cardId][BOTH_DIVIDED][countTotalString], deckStats);
      cardDeckMap[cardId][BOTH_TOGETHER][countTotal].push(deckIntegerMap[deckId]!);
      cardDeckMap[cardId][BOTH_DIVIDED][countTotalString].push(deckIntegerMap[deckId]!);
    }
  }

  // Compress the data and save it to the cardStatMatchupInfo table
  // For example, when somebody wants to see Data Vault vs. Data Vault data, raw data is 48MB
  // 1. saving decks as numbers instead of guids goes from 48MB to 5MB
  // 2. using this compression goes from 5MB to 200kb
  const dataToCompress = {
    deckIntegerMap,
    deckMatches,
    cardDeckMap,
  };

  await db.insert(cardStatMatchupInfo).values({
    id: overviewId,
    info: compressMatchupInfo(dataToCompress),
  });

  return { matchCount, cardMatchMap };
}
