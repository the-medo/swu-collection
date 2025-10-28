import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, getTableColumns, or } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';
import { db } from '../../../../db';
import type { CollectionCard } from '../../../../../types/CollectionCard.ts';

/**
 * Get contents of collection (or wantlist) :id
 * - only public or owned collection
 * */
export const collectionIdCardGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramCollectionId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');

  const isPublic = eq(collectionTable.public, true);
  const isOwner = user ? eq(collectionTable.userId, user.id) : null;

  const { collectionId, ...columns } = getTableColumns(collectionCardTable);

  const collectionContents = (await db
    .select(columns)
    .from(collectionCardTable)
    .innerJoin(collectionTable, eq(collectionCardTable.collectionId, collectionTable.id))
    .where(
      and(eq(collectionTable.id, paramCollectionId), isOwner ? or(isOwner, isPublic) : isPublic),
    )) as unknown as CollectionCard[];

  return c.json({ data: collectionContents });
});
