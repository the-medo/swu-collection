import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { collection } from '../db/schema/collection.ts';
import { and, eq, getTableColumns, or } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.ts';
import type { User } from '../../types/User.ts';
import type { Collection } from '../../types/Collection.ts';

const { email, emailVerified, ...selectUser } = getTableColumns(user);
export { selectUser };

export type UserCollectionsResponse = {
  userId: string;
  collections: Collection[];
};

export const userRoute = new Hono<AuthExtension>()
  .get('/:id/collection', async c => {
    const paramUserId = c.req.param('id');
    const user = c.get('user');

    const isPublic = eq(collection.public, true);
    const isOwner = user ? eq(collection.userId, user.id) : null;

    const userCollections = await db
      .select()
      .from(collection)
      .where(and(eq(collection.userId, paramUserId), isOwner ? or(isOwner, isPublic) : isPublic));

    await new Promise(resolve => setTimeout(resolve, 300));

    return c.json<UserCollectionsResponse>({
      userId: paramUserId,
      collections: userCollections,
    });
  })
  .get('/:id', async c => {
    const paramUserId = c.req.param('id');

    const u = await db.select(selectUser).from(user).where(eq(user.id, paramUserId));

    return c.json(u[0] as unknown as User);
  });
