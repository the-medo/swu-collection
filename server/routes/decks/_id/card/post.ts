import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckCardCreateRequest } from '../../../../../types/ZDeckCard.ts';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { db } from '../../../../db';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';

export const deckIdCardPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckCardCreateRequest),
  async c => {
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
        target: [deckCardTable.deckId, deckCardTable.cardId, deckCardTable.board],
        set: {
          quantity: sql`${deckCardTable.quantity} + ${data.quantity ?? 0}`,
          note: sql`${data.note ?? deckCardTable.note}`,
        },
      })
      .returning();

    return c.json({ data: newDeckCard[0] }, 201);
  },
);
