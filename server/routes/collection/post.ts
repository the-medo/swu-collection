import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionCreateRequest } from '../../../types/ZCollection.ts';
import { db } from '../../db';
import { collection as collectionTable } from '../../db/schema/collection.ts';

/**
 * Create new collection (or wantlist)
 * */
export const collectionPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCollectionCreateRequest),
  async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const newCollection = await db
      .insert(collectionTable)
      .values({
        userId: user.id,
        ...data,
      })
      .returning();

    return c.json({ data: newCollection }, 201);
  },
);
