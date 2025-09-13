import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../../db/schema/collection.ts';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { db } from '../../db';
import { selectUser } from '../user.ts';

export const selectCollection = getTableColumns(collectionTable);

/**
 * Get collection (or wantlist) list
 * - filter by user country/state
 * - filter by params
 * - only public!
 * */
export const collectionGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const country = c.req.query('country');
  const state = c.req.query('state');
  const collectionType = Number(c.req.query('collectionType') ?? 1);
  const limit = Number(c.req.query('limit') ?? 50);
  const offset = Number(c.req.query('offset') ?? 0);
  const sort = c.req.query('sort') ?? 'collection.created_at';
  const order = c.req.query('order') === 'desc' ? 'desc' : 'asc';

  if (state && !country) {
    return c.json({ error: 'State parameter requires country' }, 400);
  }

  const filters = [eq(collectionTable.public, true)];

  if (country) {
    filters.push(eq(userTable.country, country));
  }

  if (state) {
    filters.push(eq(userTable.state, state));
  }

  filters.push(eq(collectionTable.collectionType, collectionType));

  const collections = await db
    .select({
      user: selectUser,
      collection: selectCollection,
    })
    .from(collectionTable)
    .innerJoin(userTable, eq(collectionTable.userId, userTable.id))
    .where(and(...filters))
    .orderBy(sql.raw(`${sort} ${order}`))
    .limit(limit)
    .offset(offset);

  // Return the result
  return c.json(collections);
});
