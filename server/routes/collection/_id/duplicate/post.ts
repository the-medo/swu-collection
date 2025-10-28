import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionDuplicateRequest } from '../../../../../types/ZCollection.ts';
import { z } from 'zod';
import { and, eq, or } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { db } from '../../../../db';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';

export const collectionIdDuplicatePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCollectionDuplicateRequest),
  async c => {
    const paramCollectionId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');

    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isPublic = eq(collectionTable.public, true);
    const isOwner = eq(collectionTable.userId, user.id);

    // Get the source collection
    const sourceCollection = (
      await db
        .select()
        .from(collectionTable)
        .where(
          and(
            eq(collectionTable.id, paramCollectionId),
            or(isOwner, isPublic), // User must be owner or collection must be public
          ),
        )
    )[0];

    if (!sourceCollection) {
      return c.json({ message: "Source collection doesn't exist" }, 404);
    }

    // Create a new collection with copied data
    const newCollection = await db
      .insert(collectionTable)
      .values({
        ...data,
        userId: user.id,
        description: sourceCollection.description,
      })
      .returning();

    // Copy all cards from the source collection to the new one
    const sourceCards = await db
      .select()
      .from(collectionCardTable)
      .where(eq(collectionCardTable.collectionId, paramCollectionId));

    if (sourceCards.length > 0) {
      const cardInserts = sourceCards.map(card => ({
        ...card,
        collectionId: newCollection[0].id,
      }));

      await db.insert(collectionCardTable).values(cardInserts);
    }

    return c.json({ data: newCollection[0] }, 201);
  },
);
