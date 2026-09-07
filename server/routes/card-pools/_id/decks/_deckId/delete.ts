import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { db } from '../../../../../db';
import { deck as deckTable } from '../../../../../db/schema/deck.ts';
import { and, eq } from 'drizzle-orm';
import { getCardPoolBasedOnIdAndUser } from '../../../../../lib/card-pools/card-pool-access.ts';
import { deleteDecksOwnedByUser } from '../../../../../lib/decks/deleteDecks.ts';

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

    const result = await deleteDecksOwnedByUser(user.id, [deckId]);
    if (result.status === 'not_found') return c.json({ message: 'Deck not found' }, 404);
    if (result.status === 'conflict') {
      return c.json({ message: 'Deck is linked to tournament data and cannot be deleted' }, 409);
    }

    return c.body(null, 204);
  },
);
