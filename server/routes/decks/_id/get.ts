import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, or, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { selectUser } from '../../user.ts';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectDeck } from '../../deck.ts';
import { userDeckFavorite } from '../../../db/schema/user_deck_favorite.ts';

export const deckIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramDeckId = z.string().uuid().parse(c.req.param('id'));
  const user = c.get('user');

  const isPublic = eq(deckTable.public, true);
  const isOwner = user ? eq(deckTable.userId, user.id) : null;

  // Start with the base query
  let query = db
    .select({
      user: selectUser,
      deck: selectDeck,

      isFavorite: user ? userDeckFavorite.createdAt : sql.raw('NULL'),
    })
    .from(deckTable)
    .innerJoin(userTable, eq(deckTable.userId, userTable.id))
    .$dynamic();

  // Only add the left join if the user is logged in
  if (user) {
    query = query.leftJoin(
      userDeckFavorite,
      and(eq(userDeckFavorite.userId, user.id), eq(userDeckFavorite.deckId, deckTable.id)),
    );
  }

  // Apply where condition
  query = query.where(
    and(eq(deckTable.id, paramDeckId), isOwner ? or(isOwner, isPublic) : isPublic),
  );

  const deckData = (await query)[0];

  if (!deckData) {
    return c.json({ message: "Deck doesn't exist" }, 404);
  }

  return c.json(deckData);
});
