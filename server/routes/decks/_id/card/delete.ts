import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { zDeckCardDeleteRequest } from '../../../../../types/ZDeckCard.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { assertDeckEditable, isAdminUser } from '../../../../lib/decks/deckBranchAccess.ts';

export const deckIdCardDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('json', zDeckCardDeleteRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isAdmin = await isAdminUser(user.id);
    const editable = await assertDeckEditable(paramDeckId, user.id, isAdmin);
    if (!editable.ok) return c.json({ message: editable.message }, editable.status);

    const deckId = eq(deckCardTable.deckId, paramDeckId);
    const cardId = eq(deckCardTable.cardId, data.cardId);
    const board = eq(deckCardTable.board, data.board);

    const primaryKeyFilters = [deckId, cardId, board];

    const deletedDeckCard = (await db.delete(deckCardTable).where(and(...primaryKeyFilters)))[0];

    return c.json({ data: deletedDeckCard });
  },
);
