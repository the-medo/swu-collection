import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { collection as collectionTable } from '../../../db/schema/collection.ts';
import { db } from '../../../db';
import { collectionCard as collectionCardTable } from '../../../db/schema/collection_card.ts';

/**
 * Delete collection (or wantlist) :id
 * - only user's collection
 * */
export const collectionIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const isOwner = eq(collectionTable.userId, user.id);
  const collectionId = eq(collectionTable.id, paramCollectionId);

  const col = (await db.select().from(collectionTable).where(collectionId))[0];

  if (!col) return c.json({ message: "Card collection doesn't exist" }, 500);
  if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

  //delete collection_card
  await db
    .delete(collectionCardTable)
    .where(eq(collectionCardTable.collectionId, paramCollectionId));
  const deletedCollection = (await db.delete(collectionTable).where(collectionId).returning())[0];

  return c.json({ data: deletedCollection });
});
