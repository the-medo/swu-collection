import { Hono } from 'hono';
import { db } from '../db';
import { collection } from '../db/schema/collection.ts';
import { and, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.ts';
import type { User } from '../../types/User.ts';
import type { Collection } from '../../types/Collection.ts';
import type { Deck } from '../../types/Deck.ts';
import type { AuthExtension } from '../auth/auth.ts';

const { email, emailVerified, ...selectUser } = getTableColumns(user);
export { selectUser };

export type UserCollectionsResponse = {
  userId: string;
  collections: Collection[];
};

export type UserDecksResponse = {
  userId: string;
  decks: Deck[];
};

export const userRoute = new Hono<AuthExtension>()
  .get('/:id/collection', async c => {
    const paramUserId = c.req.param('id');
    const user = c.get('user');

    const isPublic = eq(collection.public, true);
    const isOwner = user ? eq(collection.userId, user.id) : null;
    const sort = c.req.query('sort') ?? 'collection.updated_at';
    const order = c.req.query('order') === 'asc' ? 'asc' : 'desc';

    const userCollections = await db
      .select()
      .from(collection)
      .where(and(eq(collection.userId, paramUserId), isOwner ? or(isOwner, isPublic) : isPublic))
      .orderBy(sql.raw(`${sort} ${order}`));

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
