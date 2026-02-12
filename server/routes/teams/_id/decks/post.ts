import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zTeamDeckRequest } from '../../../../../types/ZTeam.ts';
import { db } from '../../../../db';
import { teamMember } from '../../../../db/schema/team_member.ts';
import { teamDeck } from '../../../../db/schema/team_deck.ts';
import { deck } from '../../../../db/schema/deck.ts';
import { eq, and } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import z from 'zod';

export const teamsIdDecksPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTeamDeckRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const { deckId } = c.req.valid('json');

    // Check if deck exists
    const [existingDeck] = await db.select().from(deck).where(eq(deck.id, deckId)).limit(1);

    if (!existingDeck) {
      return c.json({ message: 'Deck not found' }, 404);
    }

    // Check if deck is private
    if (existingDeck.public === 0) {
      return c.json({ message: 'Private decks cannot be added to a team' }, 400);
    }

    // Check membership (owner or member)
    const [membership] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, user.id)))
      .limit(1);

    if (!membership) {
      return c.json({ message: 'You must be a team member to add decks' }, 403);
    }

    // Check if deck is already in the team
    const [existing] = await db
      .select()
      .from(teamDeck)
      .where(and(eq(teamDeck.teamId, teamId), eq(teamDeck.deckId, deckId)))
      .limit(1);

    if (existing) {
      return c.json({ message: 'This deck is already added to the team' }, 400);
    }

    const [added] = await db.insert(teamDeck).values({ teamId, deckId }).returning();

    return c.json({ data: added }, 201);
  },
);
