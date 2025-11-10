import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { db } from '../../../../../db';
import { deck as deckTable } from '../../../../../db/schema/deck.ts';
import { deckInformation as deckInformationTable } from '../../../../../db/schema/deck_information.ts';
import { cardPoolDecks, cardPoolDeckCards } from '../../../../../db/schema/card_pool_deck.ts';
import { and, eq } from 'drizzle-orm';
import { getCardPoolBasedOnIdAndUser } from '../../../../../lib/card-pools/card-pool-access.ts';

const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });

export const cardPoolsIdDecksDeckIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id, deckId } = c.req.valid('param');

    // Ensure pool is accessible (owner or non-private) and deck belongs to pool and to user
    const pool = await getCardPoolBasedOnIdAndUser(id, user);
    if (!pool) return c.json({ message: 'Card pool not found' }, 404);

    const [existing] = await db
      .select()
      .from(deckTable)
      .where(and(eq(deckTable.id, deckId), eq(deckTable.cardPoolId, id)));

    if (!existing) return c.json({ message: 'Deck not found in this pool' }, 404);
    if (existing.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);

    await db.transaction(async tx => {
      // 1) remove "pool" from decks (unset card_pool_id and bump updated_at)
      await tx
        .update(deckTable)
        .set({ cardPoolId: null, updatedAt: new Date() })
        .where(eq(deckTable.id, deckId));

      // 2) remove card_pool_deck_cards and card_pool_decks rows
      await tx.delete(cardPoolDeckCards).where(eq(cardPoolDeckCards.deckId, deckId));
      await tx
        .delete(cardPoolDecks)
        .where(and(eq(cardPoolDecks.deckId, deckId), eq(cardPoolDecks.cardPoolId, id)));

      // 3) remove rows from deck_information and decks
      await tx.delete(deckInformationTable).where(eq(deckInformationTable.deckId, deckId));
      await tx.delete(deckTable).where(eq(deckTable.id, deckId));
    });

    return c.body(null, 204);
  },
);
