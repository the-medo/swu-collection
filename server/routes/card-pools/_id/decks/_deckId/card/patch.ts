import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { and, eq } from 'drizzle-orm';
import {
  cardPoolDecks as cardPoolDecksTable,
  cardPoolDeckCards as cardPoolDeckCardsTable,
} from '../../../../../../db/schema/card_pool_deck.ts';

const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });
const zBody = z.object({
  cardPoolNumber: z.number().int().nonnegative(),
  location: z.enum(['pool', 'deck', 'trash']),
});

export const cardPoolsIdDecksDeckIdCardPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { deckId } = c.req.valid('param');
    const { cardPoolNumber, location } = c.req.valid('json');

    // Verify deck belongs to the pool and is owned by the user
    const [existingDeck] = await db
      .select()
      .from(cardPoolDecksTable)
      .where(eq(cardPoolDecksTable.deckId, deckId));

    if (!existingDeck) return c.json({ message: 'Deck not found in this pool' }, 404);
    if (existingDeck.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);

    // Update the card location for the given deck and card pool number
    const updated = await db
      .update(cardPoolDeckCardsTable)
      .set({ location })
      .where(
        and(
          eq(cardPoolDeckCardsTable.deckId, deckId),
          eq(cardPoolDeckCardsTable.cardPoolNumber, cardPoolNumber),
        ),
      )
      .returning();

    if (updated.length === 0) {
      return c.json({ message: 'Card not found in this deck' }, 404);
    }

    return c.json({
      data: { deckId, cardPoolNumber, location },
    });
  },
);
