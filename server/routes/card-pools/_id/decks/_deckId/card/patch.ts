import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../../../../db/schema/deck.ts';
import {
  cardPoolDecks as cardPoolDecksTable,
  cardPoolDeckCards as cardPoolDeckCardsTable,
} from '../../../../../../db/schema/card_pool_deck.ts';

const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });
const zBody = z.object({
  cardPoolNumbers: z.array(z.number().int().nonnegative()).nonempty(),
  location: z.enum(['pool', 'deck', 'trash']),
});

export const cardPoolsIdDecksDeckIdCardPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id, deckId } = c.req.valid('param');
    const { cardPoolNumbers, location } = c.req.valid('json');

    // Verify deck belongs to the pool and is owned by the user
    const [existingDeck] = await db
      .select()
      .from(cardPoolDecksTable)
      .where(and(eq(cardPoolDecksTable.deckId, deckId), eq(cardPoolDecksTable.cardPoolId, id)));

    if (!existingDeck) return c.json({ message: 'Deck not found in this pool' }, 404);
    if (existingDeck.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);

    // Card moves and recency commit together so the homepage resumes the latest build.
    const updated = await db.transaction(async tx => {
      const cards = await tx
        .update(cardPoolDeckCardsTable)
        .set({ location })
        .where(
          and(
            eq(cardPoolDeckCardsTable.deckId, deckId),
            inArray(cardPoolDeckCardsTable.cardPoolNumber, cardPoolNumbers),
          ),
        )
        .returning();
      if (cards.length)
        await tx
          .update(deckTable)
          .set({ updatedAt: sql`NOW()` })
          .where(eq(deckTable.id, deckId));
      return cards;
    });

    if (updated.length === 0) {
      return c.json({ message: 'Card not found in this deck' }, 404);
    }

    return c.json({
      data: { deckId, cardPoolNumbers, location },
    });
  },
);
