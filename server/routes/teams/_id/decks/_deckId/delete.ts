import { Hono } from 'hono';
import { db } from '../../../../../db';
import { teamMember } from '../../../../../db/schema/team_member.ts';
import { teamDeck } from '../../../../../db/schema/team_deck.ts';
import { eq, and } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import z from 'zod';

export const teamsIdDecksDeckIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const deckId = z.guid().parse(c.req.param('deckId'));

  // Check membership (owner or member)
  const [membership] = await db
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, user.id)))
    .limit(1);

  if (!membership) {
    return c.json({ message: 'You must be a team member to remove decks' }, 403);
  }

  const deleted = await db
    .delete(teamDeck)
    .where(and(eq(teamDeck.teamId, teamId), eq(teamDeck.deckId, deckId)))
    .returning();

  if (deleted.length === 0) {
    return c.json({ message: 'Deck not found in this team' }, 404);
  }

  return c.json({ message: 'Deck removed from team' });
});
