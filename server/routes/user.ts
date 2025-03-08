import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { collection } from '../db/schema/collection.ts';
import { deck } from '../db/schema/deck.ts';
import { and, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.ts';
import type { User } from '../../types/User.ts';
import type { Collection } from '../../types/Collection.ts';
import type { Deck } from '../../types/Deck.ts';

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

    await new Promise(resolve => setTimeout(resolve, 300));

    return c.json<UserCollectionsResponse>({
      userId: paramUserId,
      collections: userCollections,
    });
  })
  .get('/:id/deck', async c => {
    const paramUserId = c.req.param('id');
    const user = c.get('user');

    const sort = c.req.query('sort') ?? 'deck.updated_at';
    const order = c.req.query('order') === 'asc' ? 'asc' : 'desc';

    const isPublic = eq(deck.public, true);
    const isOwner = user ? eq(deck.userId, user.id) : null;

    const userDecks = await db
      .select()
      .from(deck)
      .where(and(eq(deck.userId, paramUserId), isOwner ? or(isOwner, isPublic) : isPublic))
      .orderBy(sql.raw(`${sort} ${order}`));

    await new Promise(resolve => setTimeout(resolve, 300));

    return c.json<UserDecksResponse>({
      userId: paramUserId,
      decks: userDecks,
    });
  })
  .get('/:id', async c => {
    const paramUserId = c.req.param('id');

    const u = await db.select(selectUser).from(user).where(eq(user.id, paramUserId));

    return c.json(u[0] as unknown as User);
  });
