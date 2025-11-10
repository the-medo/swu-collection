import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { visibilityToPublicMap, Visibility } from '../../../../../../shared/types/visibility.ts';
import { db } from '../../../../../db';
import { deck as deckTable } from '../../../../../db/schema/deck.ts';
import { cardPoolDecks } from '../../../../../db/schema/card_pool_deck.ts';
import { and, eq } from 'drizzle-orm';
import { getCardPoolBasedOnIdAndUser } from '../../../../../lib/card-pools/card-pool-access.ts';

const zParams = z.object({ id: z.uuid(), deckId: z.uuid() });
const zBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(Visibility).optional(),
  leaderCardId: z.string().min(1).max(200).optional(),
  baseCardId: z.string().min(1).max(200).optional(),
});

export const cardPoolsIdDecksDeckIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id, deckId } = c.req.valid('param');
    const body = c.req.valid('json');

    // Ensure pool is accessible
    const pool = await getCardPoolBasedOnIdAndUser(id, user);
    if (!pool) return c.json({ message: 'Card pool not found' }, 404);

    // Load the deck to verify ownership and membership in this pool
    const [existing] = await db
      .select()
      .from(deckTable)
      .where(and(eq(deckTable.id, deckId), eq(deckTable.cardPoolId, id)));

    if (!existing) return c.json({ message: 'Deck not found in this pool' }, 404);
    if (existing.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);

    // Build updates
    const deckUpdates: any = { updatedAt: new Date() };
    if (typeof body.name !== 'undefined') deckUpdates.name = body.name;
    if (typeof body.description !== 'undefined') deckUpdates.description = body.description;
    if (typeof body.leaderCardId !== 'undefined') deckUpdates.leaderCardId1 = body.leaderCardId;
    if (typeof body.baseCardId !== 'undefined') deckUpdates.baseCardId = body.baseCardId;

    const doUpdateVisibility = typeof body.visibility !== 'undefined';

    const result = await db.transaction(async tx => {
      // Update decks table
      if (Object.keys(deckUpdates).length > 0) {
        await tx.update(deckTable).set(deckUpdates).where(eq(deckTable.id, deckId));
      }

      // If visibility provided, update both places
      if (doUpdateVisibility && body.visibility) {
        await tx
          .update(deckTable)
          .set({ public: visibilityToPublicMap[body.visibility], updatedAt: new Date() })
          .where(eq(deckTable.id, deckId));

        await tx
          .update(cardPoolDecks)
          .set({ visibility: body.visibility })
          .where(and(eq(cardPoolDecks.deckId, deckId), eq(cardPoolDecks.cardPoolId, id)));
      }

      const [updated] = await tx
        .select()
        .from(deckTable)
        .where(eq(deckTable.id, deckId))
        .limit(1);

      return { updated };
    });

    return c.json({ data: { deck: result.updated } });
  },
);
