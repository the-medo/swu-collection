import { Hono } from 'hono';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckChangeRequest } from '../../../../db/schema/deck_change_request.ts';
import { deckBranch } from '../../../../db/schema/deck_branch.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { selectUser } from '../../../user.ts';

export const teamsIdChangeRequestsGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const membership = await getTeamMembership(teamId, user.id);
  if (!membership) {
    return c.json({ message: 'You must be a team member to view change requests' }, 403);
  }

  const rows = await db
    .select({
      changeRequest: deckChangeRequest,
      branch: deckBranch,
      branchDeck: deckTable,
      author: selectUser,
    })
    .from(deckChangeRequest)
    .innerJoin(deckBranch, eq(deckChangeRequest.branchId, deckBranch.id))
    .innerJoin(deckTable, eq(deckChangeRequest.branchDeckId, deckTable.id))
    .innerJoin(userTable, eq(deckChangeRequest.authorUserId, userTable.id))
    .where(eq(deckChangeRequest.teamId, teamId))
    .orderBy(desc(deckChangeRequest.updatedAt));

  const baseDeckIds = [...new Set(rows.map(row => row.changeRequest.baseDeckId))];
  const baseDecks =
    baseDeckIds.length > 0
      ? await db.select().from(deckTable).where(inArray(deckTable.id, baseDeckIds))
      : [];
  const baseDeckMap = new Map(baseDecks.map(deck => [deck.id, deck]));

  return c.json({
    data: rows.map(row => ({
      ...row,
      baseDeck: baseDeckMap.get(row.changeRequest.baseDeckId) ?? null,
    })),
  });
});
