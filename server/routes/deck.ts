import { and, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { deck as deckTable } from '../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../db/schema/deck_card.ts';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { selectUser } from './user.ts';
import { user as userTable } from '../db/schema/auth-schema.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckCreateRequest, zDeckUpdateRequest } from '../../types/ZDeck.ts';
import {
  type DeckCard,
  zDeckCardCreateRequest,
  zDeckCardUpdateRequest,
  zDeckCardDeleteRequest,
} from '../../types/ZDeckCard.ts';
import { z } from 'zod';

export const selectDeck = getTableColumns(deckTable);

export const deckRoute = new Hono<AuthExtension>()
  .get('/', async c => {
    const user = c.get('user');
    const userId = c.req.query('userId');
    const format = c.req.query('format');
    const leaders = c.req.query('leaders');
    const base = c.req.query('base');

    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const sort = c.req.query('sort') ?? 'deck.created_at';
    const order = c.req.query('order') === 'desc' ? 'desc' : 'asc';

    const filters = [];

    if (!userId || userId !== user?.id) filters.push(eq(deckTable.public, true));

    const decks = await db
      .select({
        user: selectUser,
        deck: selectDeck,
      })
      .from(deckTable)
      .innerJoin(userTable, eq(deckTable.userId, userTable.id))
      .where(and(...filters))
      .orderBy(sql.raw(`${sort} ${order}`))
      .limit(limit)
      .offset(offset);

    return c.json(decks);
  })
  /**
   * Create new deck
   * */
  .post('/', zValidator('json', zDeckCreateRequest), async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const newDeck = await db
      .insert(deckTable)
      .values({
        userId: user.id,
        ...data,
        description: data.description ?? '',
      })
      .returning();

    return c.json({ data: newDeck }, 201);
  })

  .get('/:id', async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');

    const isPublic = eq(deckTable.public, true);
    const isOwner = user ? eq(deckTable.userId, user.id) : null;

    const deckData = (
      await db
        .select({
          user: selectUser,
          deck: selectDeck,
        })
        .from(deckTable)
        .innerJoin(userTable, eq(deckTable.userId, userTable.id))
        .where(
          and(
            eq(deckTable.id, paramDeckId),
            isOwner ? or(isOwner, isPublic) : isPublic,
          ),
        )
    )[0];

    if (!deckData) {
      return c.json({ message: "Deck doesn't exist" }, 404);
    }

    return c.json(deckData);
  })
  .put('/:id', zValidator('json', zDeckUpdateRequest), async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(deckTable.userId, user.id);
    const deckId = eq(deckTable.id, paramDeckId);

    const updatedDeck = (
      await db
        .update(deckTable)
        .set({
          ...data,
          updatedAt: sql`NOW()`,
        })
        .where(and(isOwner, deckId))
        .returning()
    )[0];

    return c.json({ data: updatedDeck });
  })

  .delete('/:id', async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(deckTable.userId, user.id);
    const deckId = eq(deckTable.id, paramDeckId);

    const col = (await db.select().from(deckTable).where(deckId))[0];

    if (!col) return c.json({ message: "Deck doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    //delete collection_card
    await db
      .delete(deckCardTable)
      .where(eq(deckCardTable.deckId, paramDeckId));
    const deletedDeck = (await db.delete(deckTable).where(deckId).returning())[0];

    return c.json({ data: deletedDeck });
  })
  .get('/:id/card', async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const user = c.get('user');

    const isPublic = eq(deckTable.public, true);
    const isOwner = user ? eq(deckTable.userId, user.id) : null;

    const { deckId, ...columns } = getTableColumns(deckCardTable);

    const deckContents = (await db
      .select(columns)
      .from(deckCardTable)
      .innerJoin(deckTable, eq(deckCardTable.deckId, deckTable.id))
      .where(
        and(eq(deckTable.id, paramDeckId), isOwner ? or(isOwner, isPublic) : isPublic),
      )) as unknown as DeckCard[];

    return c.json({ data: deckContents });
  })
  .post('/:id/card', zValidator('json', zDeckCardCreateRequest), async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const deckId = eq(deckTable.id, paramDeckId);

    const deck = (await db.select().from(deckTable).where(deckId))[0];
    if (!deck) return c.json({ message: "Deck doesn't exist" }, 500);
    if (deck.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const newDeckCard = await db
      .insert(deckCardTable)
      .values({ ...data, deckId: paramDeckId, note: data.note ?? '' })
      .onConflictDoUpdate({
        target: [
          deckCardTable.deckId,
          deckCardTable.cardId,
          deckCardTable.board,
        ],
        set: {
          quantity: sql`${deckCardTable.quantity} + ${data.quantity ?? 0}`,
          note: sql`${data.note ?? deckCardTable.note}`,
        },
      })
      .returning();

    return c.json({ data: newDeckCard[0] }, 201);
  })
  .put('/:id/card', zValidator('json', zDeckCardUpdateRequest), async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const { id, data } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const deckTableId = eq(deckTable.id, paramDeckId);

    const d = (await db.select().from(deckTable).where(deckTableId))[0];
    if (!d) return c.json({ message: "Collection doesn't exist" }, 500);
    if (d.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const deckId = eq(deckCardTable.deckId, paramDeckId);
    const cardId = eq(deckCardTable.cardId, id.cardId);
    const board = eq(deckCardTable.board, id.board);

    const primaryKeyFilters = [deckId, cardId, board];

    const updatedDeckCard = await db
      .update(deckCardTable)
      .set({
        ...data,
        note: data.note ?? undefined,
      })
      .where(and(...primaryKeyFilters))
      .returning();

    const result = updatedDeckCard[0];

    // in case that updated card has quantity === 0, we can delete it
    if (result.quantity === 0) {
      const deletedDeckCard = (
        await db
          .delete(deckCardTable)
          .where(and(...primaryKeyFilters))
          .returning()
      )[0];

      return c.json({ data: deletedDeckCard }, 201);
    }

    return c.json({ data: result }, 201);
  })
  .delete('/:id/card', zValidator('json', zDeckCardDeleteRequest), async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const deckTableId = eq(deckTable.id, paramDeckId);

    const d = (await db.select().from(deckTable).where(deckTableId))[0];
    if (!d) return c.json({ message: "Deck doesn't exist" }, 500);
    if (d.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const deckId = eq(deckCardTable.deckId, paramDeckId);
    const cardId = eq(deckCardTable.cardId, data.cardId);
    const board = eq(deckCardTable.board, data.board);

    const primaryKeyFilters = [deckId, cardId, board];

    const deletedDeckCard = (
      await db.delete(deckCardTable).where(and(...primaryKeyFilters))
    )[0];

    return c.json({ data: deletedDeckCard });
  })

;
