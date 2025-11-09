import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { eq } from 'drizzle-orm';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { getCardPoolBasedOnIdAndUser } from '../../../../lib/card-pools/card-pool-access.ts';

type GetCardPoolCardsResponse = Partial<Record<number, string>>;

const zParams = z.object({ id: z.uuid() });

export const cardPoolsIdCardsGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    const { id } = c.req.valid('param');

    try {
      // Check visibility/access using the same rules as the pool GET route
      const pool = await getCardPoolBasedOnIdAndUser(id, user);

      if (!pool) {
        return c.json({ message: 'Card pool not found' }, 404);
      }

      // Fetch cards in the pool and return as mapping { [cardPoolNumber]: cardId }
      const rows = await db
        .select({
          cardPoolNumber: cardPoolCards.cardPoolNumber,
          cardId: cardPoolCards.cardId,
        })
        .from(cardPoolCards)
        .where(eq(cardPoolCards.cardPoolId, id));

      const mapping: GetCardPoolCardsResponse = {};
      for (const r of rows) {
        mapping[r.cardPoolNumber] = r.cardId;
      }

      return c.json(mapping);
    } catch (e) {
      return c.json({ message: 'Failed to fetch card pool cards' }, 500);
    }
  },
);
