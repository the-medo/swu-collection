import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { and, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../db/schema/collection.ts';
import { collectionCard as collectionCardTable } from '../db/schema/collection_card.ts';
import { user as userTable } from '../db/schema/auth-schema.ts';
import { zCollectionCreateRequest, zCollectionUpdateRequest } from '../../types/ZCollection.ts';
import {
  zCollectionCardUpdateRequest,
  zCollectionCardDeleteRequest,
  zCollectionCardCreateRequest,
} from '../../types/ZCollectionCard.ts';
import { selectUser } from './user.ts';
import type { CollectionCard } from '../../types/CollectionCard.ts';

export const selectCollection = getTableColumns(collectionTable);

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
    const wantlist = c.req.query('wantlist') === 'true';
    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const sort = c.req.query('sort') ?? 'collection.created_at';
    const order = c.req.query('order') === 'desc' ? 'desc' : 'asc';

    if (state && !country) {
      return c.json({ error: 'State parameter requires country' }, 400);
    }

    const filters = [eq(collectionTable.public, true)];

    if (country) {
      filters.push(eq(userTable.country, country));
    }

    if (state) {
      filters.push(eq(userTable.state, state));
    }

    filters.push(eq(collectionTable.wantlist, wantlist));

    const collections = await db
      .select({
        user: selectUser,
        collection: selectCollection,
      })
      .from(collectionTable)
      .innerJoin(userTable, eq(collectionTable.userId, userTable.id))
      .where(and(...filters))
      .orderBy(sql.raw(`${sort} ${order}`))
      .limit(limit)
      .offset(offset);

    console.log('Returning... ', collections);

    // Return the result
    return c.json(collections);
  })
  /**
   * Create new collection (or wantlist)
   * */
  .post('/', zValidator('json', zCollectionCreateRequest), async c => {
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
  })
  /**
   * Get collection / wantlist details
   * - only public or owned collection
   * */
  .get('/:id', async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');

    const isPublic = eq(collectionTable.public, true);
    const isOwner = user ? eq(collectionTable.userId, user.id) : null;

    const collectionData = (
      await db
        .select({
          user: selectUser,
          collection: selectCollection,
        })
        .from(collectionTable)
        .innerJoin(userTable, eq(collectionTable.userId, userTable.id))
        .where(
          and(
            eq(collectionTable.id, paramCollectionId),
            isOwner ? or(isOwner, isPublic) : isPublic,
          ),
        )
    )[0];

    if (!collectionData) {
      return c.json({ message: "Collection doesn't exist" }, 404);
    }

    return c.json(collectionData);
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
  })
  /**
   * Delete collection (or wantlist) :id
   * - only user's collection
   * */
  .delete('/:id', async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(collectionTable.userId, user.id);
    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];

    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    //delete collection_card
    await db
      .delete(collectionCardTable)
      .where(eq(collectionCardTable.collectionId, paramCollectionId));
    const deletedCollection = (await db.delete(collectionTable).where(collectionId).returning())[0];

    return c.json({ data: deletedCollection });
  })
  /**
   * Get contents of collection (or wantlist) :id
   * - only public or owned collection
   * */
  .get('/:id/card', async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');

    const isPublic = eq(collectionTable.public, true);
    const isOwner = user ? eq(collectionTable.userId, user.id) : null;

    const { collectionId, ...columns } = getTableColumns(collectionCardTable);

    const collectionContents = (await db
      .select(columns)
      .from(collectionCardTable)
      .innerJoin(collectionTable, eq(collectionCardTable.collectionId, collectionTable.id))
      .where(
        and(eq(collectionTable.id, paramCollectionId), isOwner ? or(isOwner, isPublic) : isPublic),
      )) as unknown as CollectionCard[];

    return c.json({ data: collectionContents });
  })
  /**
   * Insert / upsert card(+variant) into collection (wantlist)
   * - only user's collection
   * - in case of amount = 0, delete card from collection
   * */
  .post('/:id/card', zValidator('json', zCollectionCardCreateRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    // const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);
    // const cardId = eq(collectionCardTable.cardId, data.cardId);
    // const variantId = eq(collectionCardTable.variantId, data.variantId);
    // const foil = eq(collectionCardTable.foil, data.foil);
    // const condition = eq(collectionCardTable.condition, data.condition);
    // const language = eq(collectionCardTable.language, data.language);

    // const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    // if (data.amount !== undefined && data.amount === 0) {
    //   const deletedCollectionCard = (
    //     await db
    //       .delete(collectionCardTable)
    //       .where(and(...primaryKeyFilters))
    //       .returning()
    //   )[0];
    //
    //   return c.json({ data: deletedCollectionCard }, 201);
    // }

    const newCollectionCard = await db
      .insert(collectionCardTable)
      .values({ ...data, collectionId: paramCollectionId, amount: data.amount ?? 0 })
      .onConflictDoUpdate({
        target: [
          collectionCardTable.collectionId,
          collectionCardTable.cardId,
          collectionCardTable.variantId,
          collectionCardTable.foil,
          collectionCardTable.condition,
          collectionCardTable.language,
        ],
        set: {
          amount: sql`${collectionCardTable.amount} + ${data.amount ?? 0}`,
          amount2: sql`${collectionCardTable.amount2} + ${data.amount2 ?? 0}`,
          note: sql`${data.note ?? collectionCardTable.note}`,
          price: sql`${data.price ?? collectionCardTable.price}`,
        },
      })
      .returning();

    return c.json({ data: newCollectionCard[0] }, 201);
  })
  /**
   * Update card in collection (wantlist)
   * - only user's collection
   * - in case of amount = 0, delete card from collection
   * */
  .put('/:id/card', zValidator('json', zCollectionCardUpdateRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const { id, data } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);
    const cardId = eq(collectionCardTable.cardId, id.cardId);
    const variantId = eq(collectionCardTable.variantId, id.variantId);
    const foil = eq(collectionCardTable.foil, id.foil);
    const condition = eq(collectionCardTable.condition, id.condition);
    const language = eq(collectionCardTable.language, id.language);

    const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    const updatedCollectionCard = await db
      .update(collectionCardTable)
      .set({
        ...data,
      })
      .where(and(...primaryKeyFilters))
      .returning();

    const result = updatedCollectionCard[0];

    // in case that updated card has amount === 0 and amount2 is missing/also 0, we can delete it
    if (result.amount === 0 && !result.amount2) {
      const deletedCollectionCard = (
        await db
          .delete(collectionCardTable)
          .where(and(...primaryKeyFilters))
          .returning()
      )[0];

      return c.json({ data: deletedCollectionCard }, 201);
    }

    return c.json({ data: result }, 201);
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

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);
    const cardId = eq(collectionCardTable.cardId, data.cardId);
    const variantId = eq(collectionCardTable.variantId, data.variantId);
    const foil = eq(collectionCardTable.foil, data.foil);
    const condition = eq(collectionCardTable.condition, data.condition);
    const language = eq(collectionCardTable.language, data.language);

    const primaryKeyFilters = [cardCollectionId, cardId, variantId, foil, condition, language];

    const deletedCollectionCard = (
      await db.delete(collectionCardTable).where(and(...primaryKeyFilters))
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
