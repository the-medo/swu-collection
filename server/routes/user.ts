import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { collection } from '../db/schema/collection.ts';
import { and, eq, or } from 'drizzle-orm';

export const userRoute = new Hono<AuthExtension>().get('/:id/collection', async c => {
  const paramUserId = c.req.param('id');
  const user = c.get('user');

  const isPublic = eq(collection.public, true);
  const isOwner = user ? eq(collection.userId, user.id) : null;

  const userCollections = await db
    .select()
    .from(collection)
    .where(and(eq(collection.userId, paramUserId), isOwner ? or(isOwner, isPublic) : isPublic));

  await new Promise(resolve => setTimeout(resolve, 2000));

  return c.json({
    userId: paramUserId,
    collections: userCollections,
  });
});
