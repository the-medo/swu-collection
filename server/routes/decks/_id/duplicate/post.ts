import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { updateDeckInformation } from '../../../../lib/decks/updateDeckInformation.ts';
import { cardPoolDecks, cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { CardPoolLocation } from '../../../../../shared/types/cardPools.ts';

export const deckIdDuplicatePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const paramDeckId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  // 1. Get the source deck
  const sourceDeck = (await db.select().from(deckTable).where(eq(deckTable.id, paramDeckId)))[0];

  if (!sourceDeck) {
    return c.json({ message: "Source deck doesn't exist" }, 404);
  }

  // 2. Check if the deck is public/unlisted or owned by the user
  if (sourceDeck.public === 0 && sourceDeck.userId !== user.id) {
    return c.json({ message: 'Unauthorized to duplicate this deck' }, 403);
  }

  // 3. Create a new deck as a copy
  const newDeckName = `Copy of ${sourceDeck.name}`;

  const newDeck = (
    await db
      .insert(deckTable)
      .values({
        userId: user.id,
        format: sourceDeck.format,
        name: newDeckName,
        description: sourceDeck.description,
        leaderCardId1: sourceDeck.leaderCardId1,
        leaderCardId2: sourceDeck.leaderCardId2,
        baseCardId: sourceDeck.baseCardId,
        public: 2, // Always set new copies to unlisted
        cardPoolId: sourceDeck.cardPoolId,
      })
      .returning()
  )[0];

  // 4. Check if source deck is associated with a card pool
  const sourcePoolDeck = (
    await db.select().from(cardPoolDecks).where(eq(cardPoolDecks.deckId, paramDeckId))
  )[0];

  if (sourcePoolDeck) {
    // Source is a card pool deck
    // 4a. Create a new row in card_pool_decks for the duplicated deck
    await db.insert(cardPoolDecks).values({
      deckId: newDeck.id,
      cardPoolId: sourcePoolDeck.cardPoolId,
      userId: user.id,
      visibility: 'unlisted',
    });

    // 4b. Copy all rows from card_pool_deck_cards for the new deck too,
    // keeping 'deck' as 'deck' and moving all others to 'pool'
    const sourceCpCards = await db
      .select()
      .from(cardPoolDeckCards)
      .where(eq(cardPoolDeckCards.deckId, paramDeckId));

    if (sourceCpCards.length > 0) {
      await db.insert(cardPoolDeckCards).values(
        sourceCpCards.map(cp => ({
          deckId: newDeck.id,
          cardPoolNumber: cp.cardPoolNumber,
          location: cp.location === 'deck' ? CardPoolLocation.Deck : CardPoolLocation.Pool,
        })),
      );
    }
  } else {
    // Not a card pool deck: proceed with copying deck_card rows
    const sourceCards = await db
      .select()
      .from(deckCardTable)
      .where(eq(deckCardTable.deckId, paramDeckId));

    if (sourceCards.length > 0) {
      await db.insert(deckCardTable).values(
        sourceCards.map(card => ({
          deckId: newDeck.id,
          cardId: card.cardId,
          board: card.board,
          note: card.note,
          quantity: card.quantity,
        })),
      );
    }
  }

  // 6. Update deck information
  await updateDeckInformation(newDeck.id);

  return c.json(
    {
      message: 'Deck duplicated successfully',
      data: newDeck,
    },
    201,
  );
});
