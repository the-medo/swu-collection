import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { and, eq } from 'drizzle-orm';
import {
  cardPoolDeckCards,
  cardPoolDecks as cardPoolDeckTable,
} from '../../../../../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../../../../../db/schema/card_pool.ts';

export type GetCardPoolDeckCardsResponse = Partial<
  Record<
    number,
    {
      location: 'pool' | 'deck' | 'trash';
      cardId: string;
    }
  >
>;

const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });

export const cardPoolsIdDecksDeckIdCardGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    const { id, deckId } = c.req.valid('param');

    try {
      // Verify the deck belongs to this pool
      const [existingDeck] = await db
        .select({
          id: cardPoolDeckTable.deckId,
          userId: cardPoolDeckTable.userId,
          visibility: cardPoolDeckTable.visibility,
        })
        .from(cardPoolDeckTable)
        .where(and(eq(cardPoolDeckTable.deckId, deckId), eq(cardPoolDeckTable.cardPoolId, id)));

      if (!existingDeck) return c.json({ message: 'Deck not found in this pool' }, 404);

      // Ensure visibility: owner can see; otherwise must be public
      if (existingDeck.userId !== user?.id && existingDeck.visibility === 'private') {
        return c.json({ message: 'Forbidden' }, 403);
      }

      // Fetch card locations for this deck joined with card ids in this pool
      const rows = await db
        .select({
          cardPoolNumber: cardPoolDeckCards.cardPoolNumber,
          location: cardPoolDeckCards.location,
          cardId: cardPoolCards.cardId,
        })
        .from(cardPoolDeckCards)
        .innerJoin(
          cardPoolCards,
          and(
            eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
            eq(cardPoolCards.cardPoolId, id),
          ),
        )
        .where(eq(cardPoolDeckCards.deckId, deckId));

      const mapping: GetCardPoolDeckCardsResponse = {};
      for (const r of rows) {
        mapping[r.cardPoolNumber] = {
          location: r.location as 'pool' | 'deck' | 'trash',
          cardId: r.cardId,
        };
      }

      return c.json(mapping);
    } catch (e) {
      return c.json({ message: 'Failed to fetch deck cards' }, 500);
    }
  },
);
