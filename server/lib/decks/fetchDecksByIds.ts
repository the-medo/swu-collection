import { db } from '../../db';
import { eq, inArray } from 'drizzle-orm';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import type { TournamentDeckResponse } from '../../../frontend/src/api/tournaments/useGetTournamentDecks.ts';

/**
 * Fetches full deck data for a list of deck IDs
 *
 * @param deckIds - Array of deck IDs to fetch data for
 * @returns An array of objects containing tournament deck, deck, deck information, and deck card data
 */
export async function fetchDecksByIds(deckIds: string[]): Promise<TournamentDeckResponse[]> {
  if (!deckIds.length) {
    return [];
  }

  return db
    .select({
      tournamentDeck,
      deck,
      deckInformation,
    })
    .from(deck)
    .innerJoin(tournamentDeck, eq(tournamentDeck.deckId, deck.id))
    .innerJoin(deckInformation, eq(deckInformation.deckId, deck.id))
    .where(inArray(deck.id, deckIds))
    .orderBy(tournamentDeck.placement);
}
