import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionCardUpdateRequest } from '../../../../../types/ZCollectionCard.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { db } from '../../../../db';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';

/**
 * Update card in collection (wantlist)
 * - only user's collection
 * - in case of amount = 0, delete card from collection
 * */
export const collectionIdCardPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zCollectionCardUpdateRequest),
  async c => {
    const paramCollectionId = z.guid().parse(c.req.param('id'));
    const { id, data } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);
    const cardId = eq(collectionCardTable.cardId, id.cardId);
    const variantId = eq(collectionCardTable.variantId, id.variantId);
    const foil = eq(collectionCardTable.foil, id.foil);
    const condition = eq(collectionCardTable.condition, id.condition);
    const language = eq(collectionCardTable.language, id.language);

    const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    const updatedCollectionCard = await db
      .update(collectionCardTable)
      .set({
        ...data,
      })
      .where(and(...primaryKeyFilters))
      .returning();

    const result = updatedCollectionCard[0];

    // in case that updated card has amount === 0 and amount2 is missing/also 0, we can delete it
    if (result?.amount === 0 && !result?.amount2) {
      const deletedCollectionCard = (
        await db
          .delete(collectionCardTable)
          .where(and(...primaryKeyFilters))
          .returning()
      )[0];

      await updateCollectionUpdatedAt(paramCollectionId);
      return c.json({ data: deletedCollectionCard }, 201);
    }

    await updateCollectionUpdatedAt(paramCollectionId);
    return c.json({ data: result }, 201);
  },
);
