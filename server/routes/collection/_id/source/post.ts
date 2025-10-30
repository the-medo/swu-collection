import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../../db';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { collectionSourceCollection as cscTable } from '../../../../db/schema/collection_source_collection.ts';
import { and, eq } from 'drizzle-orm';

const bodySchema = z.object({
  sourceCollectionId: z.guid(),
  displayOnSource: z.boolean().optional(),
});

/**
 * Create a mapping row in collection_source_collection
 * Constraints:
 * - Authenticated user must be the owner of path :id (collectionId)
 * - Provided sourceCollectionId must be a public collection
 */
export const collectionIdSourcePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', bodySchema),
  async c => {
    const collectionId = c.req.param('id');
    if (!collectionId) {
      return c.json({ message: 'Invalid collection id' }, 400);
    }

    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { sourceCollectionId, displayOnSource } = c.req.valid('json');

    // 1) Verify ownership of target collection (collectionId)
    const owned = (
      await db
        .select({ id: collectionTable.id })
        .from(collectionTable)
        .where(and(eq(collectionTable.id, collectionId), eq(collectionTable.userId, user.id)))
    )[0];

    if (!owned) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    // 2) Verify that source collection exists and is public
    const source = (
      await db
        .select({ id: collectionTable.id, public: collectionTable.public })
        .from(collectionTable)
        .where(and(eq(collectionTable.id, sourceCollectionId), eq(collectionTable.public, true)))
    )[0];

    if (!source) {
      return c.json({ message: 'Source collection must be public' }, 400);
    }

    // 3) Optional: prevent duplicate mapping
    const existing = (
      await db
        .select({ id: cscTable.id })
        .from(cscTable)
        .where(
          and(
            eq(cscTable.collectionId, collectionId),
            eq(cscTable.sourceCollectionId, sourceCollectionId),
          ),
        )
    )[0];

    if (existing) {
      return c.json({ message: 'Mapping already exists' }, 409);
    }

    // 4) Insert mapping row
    const inserted = await db
      .insert(cscTable)
      .values({
        collectionId,
        sourceCollectionId,
        ...(displayOnSource !== undefined ? { displayOnSource } : {}),
      })
      .returning();

    return c.json(inserted[0]);
  },
);
