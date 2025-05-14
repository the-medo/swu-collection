import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { and, eq, getTableColumns, lte, or, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../db/schema/collection.ts';
import {
  collectionCard as collectionCardTable,
  type InsertCollectionCard,
} from '../db/schema/collection_card.ts';
import { batchArray } from '../lib/utils/batch.ts';
import { user as userTable } from '../db/schema/auth-schema.ts';
import {
  zCollectionCreateRequest,
  zCollectionDuplicateRequest,
  zCollectionUpdateRequest,
} from '../../types/ZCollection.ts';
import {
  zCollectionCardUpdateRequest,
  zCollectionCardDeleteRequest,
  zCollectionCardCreateRequest,
  zCollectionBulkInsertRequest,
  zCollectionImportRequest,
} from '../../types/ZCollectionCard.ts';
import { selectUser } from './user.ts';
import type { CollectionCard } from '../../types/CollectionCard.ts';
import { cardList } from '../db/lists.ts';
import { CollectionType, type SwuRarity, SwuSet } from '../../types/enums.ts';

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
    const collectionType = Number(c.req.query('collectionType') ?? 1);
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

    filters.push(eq(collectionTable.collectionType, collectionType));

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

    if (!col) return c.json({ message: "Card collection doesn't exist" }, 500);
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
  .post('/:id/bulk', zValidator('json', zCollectionBulkInsertRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Card collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);

    const wantedRarities = data.rarities.reduce(
      (p, c) => ({ ...p, [c]: true }),
      {} as Record<SwuRarity, true | undefined>,
    );
    const wantedSets = data.sets.reduce(
      (p, c) => ({ ...p, [c]: true }),
      {} as Record<SwuSet, true | undefined>,
    );
    const wantedVariants = data.variants.reduce(
      (p, v) => {
        const spl = v.split(' ');
        const standardOrHyperspace = spl[0];
        let result = p[standardOrHyperspace] ?? { foil: false, nonfoil: false };
        if (spl.length === 1) {
          result.nonfoil = true;
        } else if (spl.length === 2) {
          result.foil = true;
        }
        return { ...p, [standardOrHyperspace]: result };
      },
      {} as Record<string, { foil?: boolean; nonfoil?: boolean } | undefined>,
    );
    const condition = data.condition;
    const language = data.language;
    const note = data.note;
    const amount = data.amount;

    const cardsToInsert: InsertCollectionCard[] = [];
    Object.values(cardList).forEach(c => {
      if (!c || !c.cardId) return;
      if (!wantedRarities[c.rarity]) return;
      Object.values(c.variants).forEach(v => {
        if (!v) return;
        if (!wantedSets[v.set]) return;
        const wantedVariant = wantedVariants[v.variantName];
        if (!wantedVariant) return;

        const baseCollectionCard: Omit<InsertCollectionCard, 'foil'> = {
          collectionId: paramCollectionId,
          cardId: c.cardId,
          variantId: v.variantId,
          condition,
          language,
          amount,
          note: note ?? '',
        };

        if (v.hasFoil && wantedVariant.foil) {
          cardsToInsert.push({
            ...baseCollectionCard,
            foil: true,
          });
        }

        if (v.hasNonfoil && wantedVariant.nonfoil) {
          cardsToInsert.push({
            ...baseCollectionCard,
            foil: false,
          });
        }
      });
    });

    const newCollectionCards = await db
      .insert(collectionCardTable)
      .values(cardsToInsert)
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
          note: sql`${data.note ?? collectionCardTable.note}`,
        },
      })
      .returning();

    const deletedCollectionCards = await db
      .delete(collectionCardTable)
      .where(and(cardCollectionId, lte(collectionCardTable.amount, 0)))
      .returning();

    return c.json({
      data: {
        changed: newCollectionCards.length - deletedCollectionCards.length,
        deleted: deletedCollectionCards.length,
        amount,
      },
    });
  })
  .post('/:id/import', zValidator('json', zCollectionImportRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 404);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    // Validate cardId and variantId
    const validCards = [];
    const invalidCards = [];

    for (const card of data.cards) {
      const cardData = cardList[card.cardId];
      if (!cardData) {
        invalidCards.push({ ...card, reason: 'Card ID does not exist' });
        continue;
      }

      const variantData = cardData.variants[card.variantId];
      if (!variantData) {
        invalidCards.push({ ...card, reason: 'Variant ID does not exist for this card' });
        continue;
      }

      validCards.push(card);
    }

    if (invalidCards.length > 0) {
      return c.json({
        message: 'Some cards could not be imported because they do not exist',
        invalidCards
      }, 400);
    }

    // Prepare cards for insertion with default values
    const cardsToInsert: InsertCollectionCard[] = validCards.map(card => ({
      collectionId: paramCollectionId,
      cardId: card.cardId,
      variantId: card.variantId,
      foil: card.isFoil,
      condition: 1, // Default value
      language: 'EN', // Default value
      note: null, // Default value
      amount: card.count,
      amount2: null, // Default value
      price: null, // Default value
    }));

    const BATCH_SIZE = 2000; // Process in batches of 2000 cards
    const batches = batchArray(cardsToInsert, BATCH_SIZE);

    let allInsertedCards: any[] = [];

    // Process batches in a transaction
    await db.transaction(async (tx) => {
      for (const batch of batches) {
        const insertedBatch = await tx
          .insert(collectionCardTable)
          .values(batch)
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
              amount: sql`${collectionCardTable.amount} + EXCLUDED.amount`,
            },
          })
          .returning();

        allInsertedCards = [...allInsertedCards, ...insertedBatch];
      }
    });

    const insertedCards = allInsertedCards;

    return c.json({ 
      data: {
        inserted: insertedCards.length,
        cards: insertedCards
      }
    }, 201);
  })

  .post('/:id/duplicate', zValidator('json', zCollectionDuplicateRequest), async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
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
  });
