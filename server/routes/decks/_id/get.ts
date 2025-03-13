import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, or } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { selectUser } from '../../user.ts';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectDeck } from '../../deck.ts';

export const deckIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
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
      .where(and(eq(deckTable.id, paramDeckId), isOwner ? or(isOwner, isPublic) : isPublic))
  )[0];

  if (!deckData) {
    return c.json({ message: "Deck doesn't exist" }, 404);
  }

  return c.json(deckData);
});
