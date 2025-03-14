import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { zDeckCardDeleteRequest } from '../../../../../types/ZDeckCard.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';

export const deckIdCardDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('json', zDeckCardDeleteRequest),
  async c => {
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

    const deletedDeckCard = (await db.delete(deckCardTable).where(and(...primaryKeyFilters)))[0];

    return c.json({ data: deletedDeckCard });
  },
);
