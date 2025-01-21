import { Hono } from 'hono';
import { zCollectionCardSchema, fakeCollectionCards } from '../../types/ZCollectionCard.ts';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { SwuSet } from '../../types/enums.ts';
import { db } from '../db';
import { collection } from '../db/schema/collection.ts';
import { and, eq, sql } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.ts';
import { zCollectionCreateRequest } from '../../types/ZCollection.ts';

export const collectionRoute = new Hono<AuthExtension>()
  /**
   * Get collection (or wantlist) list
   * - filter by user country/state
   * - filter by params
   * - only public!
   * */
  .get('/', async c => {
    const country = c.req.query('country');
    const state = c.req.query('state');
    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const sort = c.req.query('sort') ?? 'created_at';
    const order = c.req.query('order') === 'desc' ? 'desc' : 'asc';

    if (state && !country) {
      return c.json({ error: 'State parameter requires country' }, 400);
    }

    const filters = [eq(collection.public, true)];

    if (country) {
      filters.push(eq(user.country, country));
    }

    if (state) {
      filters.push(eq(user.state, state));
    }

    const collections = await db
      .select()
      .from(collection)
      .innerJoin(user, eq(collection.userId, user.id))
      .where(and(...filters))
      .orderBy(sql`${sort} ${order}`)
      .limit(limit)
      .offset(offset);

    // Return the result
    return c.json({ data: collections });
  })
  /**
   * Create new collection (or wantlist)
   * */
  .post('/', zValidator('json', zCollectionCreateRequest), async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const newCollection = await db
      .insert(collection)
      .values({
        userId: user.id,
        ...data,
      })
      .returning();

    return c.json({ data: newCollection }, 201);
  })
  /**
   * Get contents of collection (or wantlist) :id
   * - only public collection
   * */
  .get('/:id', c => {
    return c.json({ data: [] });
  })
  /**
   * Update parameters of collection (or wantlist) :id
   * - only user's collection
   * */
  .put('/:id', c => {
    return c.json({ data: [] });
  })
  /**
   * Delete collection (or wantlist) :id
   * - only user's collection
   * */
  .delete('/:id', c => {
    return c.json({ data: [] });
  })
  /**
   * Insert / upsert card(+variant) into collection (wantlist)
   * - only user's collection
   * */
  .post('/:id/card', async c => {
    return c.json({ data: [] });
  })
  /**
   * Remove card(+variant) from collection (wantlist)
   * - only user's collection
   * */
  .delete('/:id/card', async c => {
    return c.json({ data: [] });
  })
  /**
   * Bulk action with collection (wantlist)
   *    - add to collection
   *    - update amounts in collection
   * - only user's collection
   * */
  .post('/:id/bulk', async c => {
    return c.json({ data: [] });
  });

/*
  .get('/collection-size', c => {
    const user = c.get('user');
    console.log(user);
    if (!user) return c.body(null, 401);
    return c.json({
      totalOwned: fakeCollectionCards.reduce((p, c) => p + 1, 0),
      user: user?.id,
    });
  })
  .post('/', zValidator('json', collectionCardSchema), async c => {
    const data = await c.req.valid('json');
    const collectionCard = collectionCardSchema.parse(data);
    c.status(201);
    fakeCollectionCards.push(collectionCard);
    return c.json(collectionCard);
  })
  .get('/:set', c => {
    const set = swuSetSchema.parse(c.req.param('set'));
    const collection = fakeCollectionCards.filter(fcc => true);
    return c.json({ collection: collection });
  });
*/
