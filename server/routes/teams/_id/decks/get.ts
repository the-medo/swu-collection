import { Hono } from 'hono';
import { db } from '../../../../db';
import { teamDeck } from '../../../../db/schema/team_deck.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { selectDeck } from '../../../deck.ts';
import { selectUser } from '../../../user.ts';

export const teamsIdDecksGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const teamId = z.string().uuid().parse(c.req.param('id'));

  const rows = await db
    .select({
      deck: selectDeck,
      user: selectUser,
      addedAt: teamDeck.addedAt,
    })
    .from(teamDeck)
    .innerJoin(deckTable, eq(teamDeck.deckId, deckTable.id))
    .innerJoin(userTable, eq(deckTable.userId, userTable.id))
    .where(eq(teamDeck.teamId, teamId));

  return c.json({ data: rows });
});
