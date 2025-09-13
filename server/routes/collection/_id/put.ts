import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionUpdateRequest } from '../../../../types/ZCollection.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../../../db/schema/collection.ts';
import { db } from '../../../db';

/**
 * Update parameters of collection (or wantlist) :id
 * - only user's collection
 * */
export const collectionIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zCollectionUpdateRequest),
  async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(collectionTable.userId, user.id);
    const collectionId = eq(collectionTable.id, paramCollectionId);

    const updatedCollection = (
      await db
        .update(collectionTable)
        .set({
          ...data,
          updatedAt: sql`NOW()`,
        })
        .where(and(isOwner, collectionId))
        .returning()
    )[0];

    return c.json({ data: updatedCollection });
  },
);
