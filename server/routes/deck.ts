import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { deck as deckTable } from '../db/schema/deck.ts';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { selectUser } from './user.ts';
import { collection as collectionTable } from '../db/schema/collection.ts';
import { user as userTable } from '../db/schema/auth-schema.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionCreateRequest } from '../../types/ZCollection.ts';
import { zDeckCreateRequest } from '../../types/ZDeck.ts';

export const selectDeck = getTableColumns(deckTable);

export const deckRoute = new Hono<AuthExtension>()
  .get('/', async c => {
    const user = c.get('user');
    const userId = c.req.query('userId');
    const format = c.req.query('format');
    const leaders = c.req.query('leaders');
    const base = c.req.query('base');

    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const sort = c.req.query('sort') ?? 'deck.created_at';
    const order = c.req.query('order') === 'desc' ? 'desc' : 'asc';

    const filters = [];

    if (!userId || userId !== user?.id) filters.push(eq(deckTable.public, true));

    const decks = await db
      .select({
        user: selectUser,
        deck: selectDeck,
      })
      .from(deckTable)
      .innerJoin(userTable, eq(deckTable.userId, userTable.id))
      .where(and(...filters))
      .orderBy(sql.raw(`${sort} ${order}`))
      .limit(limit)
      .offset(offset);

    return c.json(decks);
  })
  /**
   * Create new deck
   * */
  .post('/', zValidator('json', zDeckCreateRequest), async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const newDeck = await db
      .insert(deckTable)
      .values({
        userId: user.id,
        ...data,
        description: data.description ?? '',
      })
      .returning();

    return c.json({ data: newDeck }, 201);
  });
