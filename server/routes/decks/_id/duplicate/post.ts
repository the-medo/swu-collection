import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { updateDeckInformation } from '../../../../lib/decks/updateDeckInformation.ts';

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
      })
      .returning()
  )[0];

  // 4. Get all cards from the source deck
  const sourceCards = await db
    .select()
    .from(deckCardTable)
    .where(eq(deckCardTable.deckId, paramDeckId));

  if (sourceCards.length > 0) {
    // 5. Copy all cards to the new deck
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
