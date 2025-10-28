import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, or } from 'drizzle-orm';
import { collection as collectionTable } from '../../../db/schema/collection.ts';
import { db } from '../../../db';
import { selectUser } from '../../user.ts';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectCollection } from '../../collection.ts';

/**
 * Get collection / wantlist details
 * - only public or owned collection
 * */
export const collectionIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramCollectionId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');

  const isPublic = eq(collectionTable.public, true);
  const isOwner = user ? eq(collectionTable.userId, user.id) : null;

  const collectionData = (
    await db
      .select({
        user: selectUser,
        collection: selectCollection,
      })
      .from(collectionTable)
      .innerJoin(userTable, eq(collectionTable.userId, userTable.id))
      .where(
        and(eq(collectionTable.id, paramCollectionId), isOwner ? or(isOwner, isPublic) : isPublic),
      )
  )[0];

  if (!collectionData) {
    return c.json({ message: "Collection doesn't exist" }, 404);
  }

  return c.json(collectionData);
});
