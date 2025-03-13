import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, getTableColumns, or } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { db } from '../../../../db';
import type { DeckCard } from '../../../../../types/ZDeckCard.ts';

export const deckIdCardGetRoute = new Hono<AuthExtension>().get('/:id/card', async c => {
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
});
