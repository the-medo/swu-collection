import { Hono } from 'hono';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../../../db';
import { collection as collectionTable } from '../../../../../db/schema/collection.ts';
import { collectionSourceCollection as cscTable } from '../../../../../db/schema/collection_source_collection.ts';
import { and, eq } from 'drizzle-orm';

const bodySchema = z.object({
  id: z.number().int(), // mapping row id (NOT the path _id)
  displayOnSource: z.boolean(),
});

export const collectionIdSourceDisplayPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', bodySchema),
  async c => {
    const paramCollectionId = c.req.param('id'); // route param, UUID of the collection, not used directly for update
    if (!paramCollectionId) {
      return c.json({ message: 'Invalid collection id' }, 400);
    }

    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id: mappingId, displayOnSource } = c.req.valid('json');

    // 1) Get mapping row by its integer id
    const mapping = (
      await db.select().from(cscTable).where(eq(cscTable.id, mappingId))
    )[0];

    if (!mapping) {
      return c.json({ message: 'Mapping not found' }, 404);
    }

    // 2) Check the source collection ownership (by source_collection_id)
    const sourceCollection = (
      await db
        .select({ id: collectionTable.id, userId: collectionTable.userId })
        .from(collectionTable)
        .where(and(eq(collectionTable.id, mapping.sourceCollectionId), eq(collectionTable.userId, user.id)))
    )[0];

    if (!sourceCollection) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    // Optional: ensure the mapping actually relates to the route collection id provided
    // Not strictly required by the spec, but prevents cross-id tampering
    if (
      mapping.sourceCollectionId !== paramCollectionId &&
      mapping.collectionId !== paramCollectionId
    ) {
      return c.json({ message: 'Mapping does not relate to provided collection id' }, 400);
    }

    // 3) Update display_on_source to requested value
    const updated = await db
      .update(cscTable)
      .set({ displayOnSource })
      .where(eq(cscTable.id, mappingId))
      .returning();

    return c.json({ data: updated[0] });
  },
);
