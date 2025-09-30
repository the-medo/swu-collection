import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { deckCard as deckCardTable } from '../../../db/schema/deck_card.ts';
import { deckInformation as deckInformationTable } from '../../../db/schema/deck_information.ts';
import type { AuthExtension } from '../../../auth/auth.ts';

export const deckIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const paramDeckId = z.string().uuid().parse(c.req.param('id'));
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const deckTableId = eq(deckTable.id, paramDeckId);

  const d = (await db.select().from(deckTable).where(deckTableId))[0];
  if (!d) return c.json({ message: "Deck doesn't exist" }, 500);
  if (d.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

  await db.delete(deckInformationTable).where(eq(deckInformationTable.deckId, paramDeckId));
  await db.delete(deckCardTable).where(eq(deckCardTable.deckId, paramDeckId));
  const deletedDeck = (
    await db.delete(deckTable).where(eq(deckTable.id, paramDeckId)).returning()
  )[0];

  return c.json({ data: deletedDeck });
});
