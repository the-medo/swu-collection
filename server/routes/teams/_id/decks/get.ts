import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../../../db';
import { teamDeck } from '../../../../db/schema/team_deck.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { desc, eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { selectDeck } from '../../../deck.ts';
import { selectUser } from '../../../user.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { withPagination } from '../../../../lib/withPagination.ts';

const zQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const teamsIdDecksGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zQuery),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.string().uuid().parse(c.req.param('id'));

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to view team decks' }, 403);
    }

    const { limit, offset } = c.req.valid('query');

    let query = db
      .select({
        deck: selectDeck,
        user: selectUser,
        addedAt: teamDeck.addedAt,
      })
      .from(teamDeck)
      .innerJoin(deckTable, eq(teamDeck.deckId, deckTable.id))
      .innerJoin(userTable, eq(deckTable.userId, userTable.id))
      .where(eq(teamDeck.teamId, teamId))
      .orderBy(desc(teamDeck.addedAt))
      .$dynamic();

    query = withPagination(query, limit, offset);

    const data = await query;

    return c.json({
      data,
      pagination: {
        limit,
        offset,
        hasMore: data.length === limit,
      },
    });
  },
);
