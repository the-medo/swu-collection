import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckCardUpdateRequest } from '../../../../../types/ZDeckCard.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { db } from '../../../../db';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { assertDeckEditable, isAdminUser } from '../../../../lib/decks/deckBranchAccess.ts';

export const deckIdCardPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zDeckCardUpdateRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const { id, data } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isAdmin = await isAdminUser(user.id);
    const editable = await assertDeckEditable(paramDeckId, user.id, isAdmin);
    if (!editable.ok) return c.json({ message: editable.message }, editable.status);

    const deckId = eq(deckCardTable.deckId, paramDeckId);
    const cardId = eq(deckCardTable.cardId, id.cardId);
    const board = eq(deckCardTable.board, id.board);

    const primaryKeyFilters = [deckId, cardId, board];

    const updatedDeckCard = await db
      .insert(deckCardTable)
      .values({
        deckId: paramDeckId,
        cardId: id.cardId,
        board: id.board,
        note: data.note ?? '',
        quantity: data.quantity ?? 0,
      })
      .onConflictDoUpdate({
        target: [deckCardTable.deckId, deckCardTable.cardId, deckCardTable.board],
        set: {
          ...data,
          note: data.note ?? undefined,
        },
      })
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
  },
);
