import { db } from '../../db';
import { and, eq, SQL, sql } from 'drizzle-orm';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { fetchTournamentIdsForMeta } from '../card-statistics/meta.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { aspectArray } from '../../../types/iterableEnumInfo.ts';
import type { SwuAspect } from '../../../types/enums.ts';
import { cardList } from '../../db/lists.ts';
import { isBasicBase } from '../../../shared/lib/isBasicBase.ts';
import type { CardDeckData } from '../../../types/CardDeckData.ts';
import { fetchTournamentIdsForGroup } from '../tournament-group/fetch-tournament-ids-for-group.ts';

type FetchCardDecksDataParams = {
  cardId: string;
  tournamentId?: string;
  tournamentGroupId?: string;
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
  if (!params.metaId && !params.tournamentId && !params.tournamentGroupId) {
    throw new Error('Either metaId or tournamentId must be provided');
  }
  const { cardId, metaId, tournamentId, tournamentGroupId, leaderCardId, baseCardId } = params;

  let tournamentIds: string[] = [];

  if (tournamentGroupId) {
    tournamentIds = await fetchTournamentIdsForGroup(tournamentGroupId);
  } else if (metaId) {
    tournamentIds = await fetchTournamentIdsForMeta(metaId);
  } else if (tournamentId) {
    tournamentIds = [tournamentId];
  }

  // Get tournament decks
  let conditions: SQL<unknown>[] = [sql`${tournamentDeck.tournamentId} IN ${tournamentIds}`];

  if (leaderCardId) {
    conditions.push(eq(deck.leaderCardId1, leaderCardId));
  }

  if (baseCardId) {
    if (aspectArray.includes(baseCardId as SwuAspect)) {
      let basicBaseCardIds: string[] = [];
      Object.entries(cardList).forEach(([cardId, card]) => {
        if (
          card?.type === 'Base' &&
          card.aspects.includes(baseCardId as SwuAspect) &&
          isBasicBase(card)
        ) {
          basicBaseCardIds.push(cardId);
        }
      });
      conditions.push(sql`${deck.baseCardId} IN ${basicBaseCardIds}`);
    } else {
      conditions.push(eq(deck.baseCardId, baseCardId));
    }
  }

  return db
    .select({
      tournamentDeck,
      deck,
      deckInformation,
      deckCard,
    })
    .from(tournamentDeck)
    .innerJoin(deck, eq(deck.id, tournamentDeck.deckId))
    .innerJoin(deckInformation, eq(deck.id, deckInformation.deckId))
    .innerJoin(deckCard, and(eq(deckCard.deckId, deck.id), eq(deckCard.cardId, cardId)))
    .where(and(...conditions))
    .orderBy(tournamentDeck.placement)
    .limit(25);
}
