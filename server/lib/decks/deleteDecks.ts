import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../../db';
import { cardPoolDeckCards, cardPoolDecks } from '../../db/schema/card_pool_deck.ts';
import { cardStatMatchupDecks } from '../../db/schema/card_stat_matchup_schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { entityResource } from '../../db/schema/entity_resource.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentMatch } from '../../db/schema/tournament_match.ts';

export type DeleteDecksResult =
  | {
      status: 'deleted';
      deletedDecks: (typeof deck.$inferSelect)[];
      affectedCardPoolIds: string[];
    }
  | { status: 'not_found' }
  | { status: 'conflict' };

/**
 * Deletes owned decks and their manually-managed dependants as one atomic operation.
 * Tournament-linked decks are intentionally protected because deleting them would
 * corrupt imported tournament history.
 */
export const deleteDecksOwnedByUser = async (
  userId: string,
  deckIds: string[],
): Promise<DeleteDecksResult> =>
  db.transaction(async tx => {
    const ownedDecks = await tx
      .select()
      .from(deck)
      .where(and(eq(deck.userId, userId), inArray(deck.id, deckIds)))
      .for('update');

    if (ownedDecks.length !== deckIds.length) {
      return { status: 'not_found' };
    }

    const [linkedTournamentDeck] = await tx
      .select({ deckId: tournamentDeck.deckId })
      .from(tournamentDeck)
      .where(inArray(tournamentDeck.deckId, deckIds))
      .limit(1);

    if (linkedTournamentDeck) {
      return { status: 'conflict' };
    }

    const [linkedTournamentMatch] = await tx
      .select({ id: tournamentMatch.id })
      .from(tournamentMatch)
      .where(
        or(inArray(tournamentMatch.p1DeckId, deckIds), inArray(tournamentMatch.p2DeckId, deckIds)),
      )
      .limit(1);

    if (linkedTournamentMatch) {
      return { status: 'conflict' };
    }

    const linkedCardPoolDecks = await tx
      .select({ cardPoolId: cardPoolDecks.cardPoolId })
      .from(cardPoolDecks)
      .where(inArray(cardPoolDecks.deckId, deckIds));

    const affectedCardPoolIds = [
      ...new Set(
        [
          ...ownedDecks.map(ownedDeck => ownedDeck.cardPoolId),
          ...linkedCardPoolDecks.map(link => link.cardPoolId),
        ].filter((cardPoolId): cardPoolId is string => cardPoolId !== null),
      ),
    ];

    await tx.delete(cardStatMatchupDecks).where(inArray(cardStatMatchupDecks.deckId, deckIds));
    await tx.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
    await tx.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
    await tx
      .delete(entityResource)
      .where(and(eq(entityResource.entityType, 'deck'), inArray(entityResource.entityId, deckIds)));
    await tx.delete(cardPoolDeckCards).where(inArray(cardPoolDeckCards.deckId, deckIds));
    await tx.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, deckIds));

    const deletedDecks = await tx
      .delete(deck)
      .where(and(eq(deck.userId, userId), inArray(deck.id, deckIds)))
      .returning();

    if (deletedDecks.length !== deckIds.length) {
      throw new Error('Not all requested decks were deleted');
    }

    return { status: 'deleted', deletedDecks, affectedCardPoolIds };
  });
