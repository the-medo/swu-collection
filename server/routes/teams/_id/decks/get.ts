import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../../../db';
import { teamDeck } from '../../../../db/schema/team_deck.ts';
import { type Deck, deck as deckTable } from '../../../../db/schema/deck.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { selectDeck } from '../../../deck.ts';
import { selectUser } from '../../../user.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { withPagination } from '../../../../lib/withPagination.ts';
import type { User } from '../../../../../types/User.ts';
import { uuidSchema } from '../../../../../shared/lib/zod/uuid.ts';

const zQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  quickFilter: z
    .string()
    .trim()
    .optional()
    .transform(value => value || undefined),
});

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export type TeamDeckExpanded = {
  deck: Deck;
  user: User;
  addedAt: string;
};

export const teamsIdDecksGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zQuery),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = uuidSchema.parse(c.req.param('id'));

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to view team decks' }, 403);
    }

    const { limit, offset, quickFilter } = c.req.valid('query');
    const quickFilterTerms = quickFilter?.split(/\s+/).filter(Boolean) ?? [];
    const whereClause =
      quickFilterTerms.length > 0
        ? and(
            eq(teamDeck.teamId, teamId),
            ...quickFilterTerms.map(term => {
              const pattern = `%${escapeLikePattern(term)}%`;

              return sql<boolean>`(
                coalesce(${deckTable.name}, '') ilike ${pattern} escape '\\'
                or coalesce(${deckTable.leaderCardId1}, '') ilike ${pattern} escape '\\'
                or coalesce(${deckTable.baseCardId}, '') ilike ${pattern} escape '\\'
              )`;
            }),
          )
        : eq(teamDeck.teamId, teamId);

    let query = db
      .select({
        deck: selectDeck,
        user: selectUser,
        addedAt: teamDeck.addedAt,
      })
      .from(teamDeck)
      .innerJoin(deckTable, eq(teamDeck.deckId, deckTable.id))
      .innerJoin(userTable, eq(deckTable.userId, userTable.id))
      .where(whereClause)
      .orderBy(desc(teamDeck.addedAt))
      .$dynamic();

    query = withPagination(query, limit, offset);

    const data = (await query) as unknown as TeamDeckExpanded[];

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
