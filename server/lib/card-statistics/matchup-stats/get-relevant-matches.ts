import { db } from '../../../db';
import {
  cardStatMatchupDecks,
  cardStatMatchupTournaments,
} from '../../../db/schema/card_stat_matchup_schema.ts';
import { and, eq, or } from 'drizzle-orm';
import { tournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { deck } from '../../../db/schema/deck.ts';
import { deckInformation } from '../../../db/schema/deck_information.ts';
import { baseSpecialNames } from '../../../../shared/lib/basicBases.ts';
import { batchArray } from '../../utils/batch.ts';
import { tournamentMatch } from '../../../db/schema/tournament_match.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';

export async function getRelevantMatches(
  overviewId: string,
  leaderId2?: string,
  baseId2?: string,
): Promise<string[]> {
  // Check if baseId corresponds to a special base name
  const base2SpecialName = baseId2 ? baseSpecialNames[baseId2] : undefined;

  // Build the base query with all necessary joins
  let query1 = db
    .select({
      deckId: deck.id,
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
      deckId: deck.id,
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
    );
    query1 = query1.where(leaderBaseConditions);
    query2 = query2.where(leaderBaseConditions);
  }

  // Execute the query
  const matches1 = await query1;
  const matches2 = await query2;

  const deckMatchMap: Record<
    string,
    | {
        total: number;
        gameWins: number;
        gameLosses: number;
        gameDraws: number;
        matchWins: number;
        matchLosses: number;
        matchDraws: number;
      }
    | undefined
  > = {};

  for (const match of matches1) {
    const { deckId } = match;
    if (!deckMatchMap[deckId]) {
      deckMatchMap[deckId] = {
        total: 0,
        gameWins: 0,
        gameLosses: 0,
        gameDraws: 0,
        matchWins: 0,
        matchLosses: 0,
        matchDraws: 0,
      };
    }
    deckMatchMap[deckId].total++;
    deckMatchMap[deckId].gameWins += match.gameWin;
    deckMatchMap[deckId].gameLosses += match.gameLose;
    deckMatchMap[deckId].gameDraws += match.gameDraw;
    deckMatchMap[deckId].matchWins += match.result === 3 ? 1 : 0;
    deckMatchMap[deckId].matchLosses += match.result === 0 ? 1 : 0;
    deckMatchMap[deckId].matchDraws += match.result === 1 ? 1 : 0;
  }

  for (const match of matches2) {
    const { deckId } = match;
    if (!deckMatchMap[deckId]) {
      deckMatchMap[deckId] = {
        total: 0,
        gameWins: 0,
        gameLosses: 0,
        gameDraws: 0,
        matchWins: 0,
        matchLosses: 0,
        matchDraws: 0,
      };
    }
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

  console.log({ deckMatchMap });

  return [];
}
