import { Hono } from 'hono';
import { collectionCardSchema, fakeCollectionCards } from '../types/CollectionCard.ts';
import { z } from 'zod';
import { SwuSet } from '../types/SwuSet.ts';
import { zValidator } from '@hono/zod-validator';

const swuSetSchema = z.nativeEnum(SwuSet);

export const collectionRoute = new Hono()
  .get('/', c => {
    return c.json({ collection: fakeCollectionCards });
  })
  .post('/', zValidator('json', collectionCardSchema), async c => {
    const data = await c.req.valid('json');
    const collectionCard = collectionCardSchema.parse(data);
    c.status(201);
    return c.json(collectionCard);
  })
  .get('/:set', c => {
    const set = swuSetSchema.parse(c.req.param('set'));
    const collection = fakeCollectionCards.filter(fcc => fcc.set === set);
    return c.json({ collection: collection });
  });
