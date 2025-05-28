import { db } from '../../db';
import { and, eq, sql } from 'drizzle-orm';
import { type TournamentDeck, tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { type Deck, deck } from '../../db/schema/deck.ts';
import { type DeckCard, deckCard } from '../../db/schema/deck_card.ts';
import { fetchTournamentIdsForMeta } from '../card-statistics/meta.ts';

export type CardDeckData = {
  tournamentDeck: TournamentDeck;
  deck: Deck;
  deckCard: DeckCard;
};

type FetchCardDecksDataParams = {
  cardId: string;
  tournamentId?: string;
  metaId?: number;
  leaderCardId?: string;
  baseCardId?: string;
};

/**
 * Fetches deck data that contains a specific card, filtered by tournament or meta.
 *
 * @param params - The parameters for fetching card decks data
 * @param params.cardId - The ID of the card to find in decks
 * @param params.tournamentId - Optional tournament ID to filter decks
 * @param params.metaId - Optional meta ID to filter decks by a group of tournaments
 * @param params.leaderCardId - Optional leader card ID to filter decks
 * @param params.baseCardId - Optional base card ID to filter decks
 * @returns An array of objects containing tournament deck, deck, and deck card data
 * @throws Error if neither metaId nor tournamentId is provided
 */
export async function fetchCardDecksData(
  params: FetchCardDecksDataParams,
): Promise<CardDeckData[]> {
  if (!params.metaId && !params.tournamentId) {
    throw new Error('Either metaId or tournamentId must be provided');
  }
  const { cardId, metaId, tournamentId, leaderCardId, baseCardId } = params;

  const tournamentIds = tournamentId ? [tournamentId] : await fetchTournamentIdsForMeta(metaId!);

  // Get tournament decks
  let conditions = [sql`${tournamentDeck.tournamentId} IN ${tournamentIds}`];

  if (leaderCardId) {
    conditions.push(eq(deck.leaderCardId1, leaderCardId));
  }

  if (baseCardId) {
    conditions.push(eq(deck.baseCardId, baseCardId));
  }

  return db
    .select({
      tournamentDeck,
      deck,
      deckCard,
    })
    .from(tournamentDeck)
    .innerJoin(deck, eq(deck.id, tournamentDeck.deckId))
    .innerJoin(deckCard, and(eq(deckCard.deckId, deck.id), eq(deckCard.cardId, cardId)))
    .where(and(...conditions))
    .orderBy(tournamentDeck.placement)
    .limit(25);
}
