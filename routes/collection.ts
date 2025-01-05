import { Hono } from 'hono';
import { fakeCollectionCards } from '../types/CollectionCard.ts';

export const collectionRoute = new Hono()
  .get('/', c => {
    return c.json({ collection: fakeCollectionCards });
  })
  .post('/', async c => {
    const collectionCard = await c.req.json();
    return c.json(collectionCard);
  });
