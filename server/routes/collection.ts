import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { collection } from '../db/schema/collection.ts';
import { and, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.ts';
import { zCollectionCreateRequest, zCollectionUpdateRequest } from '../../types/ZCollection.ts';
import {
  zCollectionCardUpdateRequest,
  zCollectionCardDeleteRequest,
} from '../../types/ZCollectionCard.ts';
import { collectionCard } from '../db/schema/collection_card.ts';
import { selectUser } from './user.ts';

export const selectCollection = getTableColumns(collection);

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
      .select({
        user: selectUser,
        collection: selectCollection,
      })
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
   * - only public or owned collection
   * */
  .get('/:id', async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');

    const isPublic = eq(collection.public, true);
    const isOwner = user ? eq(collection.userId, user.id) : null;

    const collectionContents = await db
      .select({ ...getTableColumns(collectionCard) })
      .from(collectionCard)
      .innerJoin(collection, eq(collectionCard.collectionId, collection.id))
      .where(and(eq(collection.id, paramCollectionId), isOwner ? or(isOwner, isPublic) : isPublic));

    return c.json({ data: collectionContents });
  })
  /**
   * Update parameters of collection (or wantlist) :id
   * - only user's collection
   * */
  .put('/:id', zValidator('json', zCollectionUpdateRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(collection.userId, user.id);
    const collectionId = eq(collection.id, paramCollectionId);

    const updatedCollection = await db
      .update(collection)
      .set({
        ...data,
        updatedAt: sql`NOW()`,
      })
      .where(and(isOwner, collectionId))
      .returning();

    return c.json({ data: updatedCollection });
  })
  /**
   * Delete collection (or wantlist) :id
   * - only user's collection
   * */
  .delete('/:id', async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(collection.userId, user.id);
    const collectionId = eq(collection.id, paramCollectionId);

    const col = (await db.select().from(collection).where(collectionId))[0];

    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    //delete collection_card
    await db.delete(collectionCard).where(collectionId);
    const deletedCollection = await db.delete(collection).where(collectionId).returning();

    return c.json({ data: deletedCollection });
  })
  /**
   * Insert / upsert card(+variant) into collection (wantlist)
   * - only user's collection
   * - in case of amount = 0, delete card from collection
   * */
  .post('/:id/card', zValidator('json', zCollectionCardUpdateRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collection.id, paramCollectionId);

    const col = (await db.select().from(collection).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCard.collectionId, paramCollectionId);
    const cardId = eq(collectionCard.cardId, data.cardId);
    const variantId = eq(collectionCard.variantId, data.variantId);
    const foil = eq(collectionCard.foil, data.foil);
    const condition = eq(collectionCard.condition, data.condition);
    const language = eq(collectionCard.language, data.language);

    const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    if (data.amount !== undefined && data.amount === 0) {
      const deletedCollectionCard = (
        await db.delete(collectionCard).where(and(...primaryKeyFilters))
      )[0];

      return c.json({ data: deletedCollectionCard });
    }

    const newCollectionCard = await db
      .insert(collectionCard)
      .values({ ...data, collectionId: paramCollectionId, amount: data.amount ?? 0 })
      .onConflictDoUpdate({
        target: [
          collectionCard.collectionId,
          collectionCard.cardId,
          collectionCard.variantId,
          collectionCard.foil,
          collectionCard.condition,
          collectionCard.language,
        ],
        set: {
          ...data,
        },
      });

    return c.json({ data: newCollectionCard });
  })
  /**
   * Remove card(+variant) from collection (wantlist)
   * - only user's collection
   * */
  .delete('/:id/card', zValidator('json', zCollectionCardDeleteRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collection.id, paramCollectionId);

    const col = (await db.select().from(collection).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCard.collectionId, paramCollectionId);
    const cardId = eq(collectionCard.cardId, data.cardId);
    const variantId = eq(collectionCard.variantId, data.variantId);
    const foil = eq(collectionCard.foil, data.foil);
    const condition = eq(collectionCard.condition, data.condition);
    const language = eq(collectionCard.language, data.language);

    const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    const deletedCollectionCard = (
      await db.delete(collectionCard).where(and(...primaryKeyFilters))
    )[0];

    return c.json({ data: deletedCollectionCard });
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
