import { Hono } from 'hono';
import { db } from '../../../../db';
import { teamDeck } from '../../../../db/schema/team_deck.ts';
import { desc, eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';

export const teamsIdDeckMapGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.string().uuid().parse(c.req.param('id'));

  const membership = await getTeamMembership(teamId, user.id);
  if (!membership) {
    return c.json({ message: 'You must be a team member to view team deck map' }, 403);
  }

  const rows = await db
    .select({
      deckId: teamDeck.deckId,
      addedAt: teamDeck.addedAt,
    })
    .from(teamDeck)
    .where(eq(teamDeck.teamId, teamId))
    .orderBy(desc(teamDeck.addedAt));

  return c.json({ data: rows });
});
