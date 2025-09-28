import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionCardDeleteRequest } from '../../../../../types/ZCollectionCard.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { db } from '../../../../db';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';

/**
 * Remove card(+variant) from collection (wantlist)
 * - only user's collection
 * */
export const collectionIdCardDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('json', zCollectionCardDeleteRequest),
  async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);
    const cardId = eq(collectionCardTable.cardId, data.cardId);
    const variantId = eq(collectionCardTable.variantId, data.variantId);
    const foil = eq(collectionCardTable.foil, data.foil);
    const condition = eq(collectionCardTable.condition, data.condition);
    const language = eq(collectionCardTable.language, data.language);

    const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    const deletedCollectionCard = (
      await db.delete(collectionCardTable).where(and(...primaryKeyFilters))
    )[0];

    await updateCollectionUpdatedAt(paramCollectionId);
    return c.json({ data: deletedCollectionCard });
  },
);
