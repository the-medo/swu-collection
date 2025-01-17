import { Hono } from 'hono';
import { collectionCardSchema, fakeCollectionCards } from '../../types/CollectionCard.ts';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { SwuSet } from '../../types/enums.ts';

const swuSetSchema = z.nativeEnum(SwuSet);

export const collectionRoute = new Hono<AuthExtension>()
  /**
   * Get collection (or wantlist) list
   * - filter by user country/state
   * - filter by params
   * - only public!
   * */
  .get('/', c => {
    return c.json({ data: [] });
  })
  /**
   * Create new collection (or wantlist)
   * */
  .post('/', async c => {
    return c.json({ data: [] });
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
