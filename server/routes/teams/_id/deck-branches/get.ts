import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckBranch } from '../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../db/schema/deck_change_request.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { selectUser } from '../../../user.ts';

export const teamsIdDeckBranchesGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const membership = await getTeamMembership(teamId, user.id);
  if (!membership) return c.json({ message: 'You must be a team member to view branches' }, 403);

  const rows = await db
    .select({
      branch: deckBranch,
      branchDeck: deckTable,
      creator: selectUser,
      changeRequest: deckChangeRequest,
    })
    .from(deckBranch)
    .innerJoin(deckTable, eq(deckBranch.branchDeckId, deckTable.id))
    .innerJoin(userTable, eq(deckBranch.creatorUserId, userTable.id))
    .leftJoin(deckChangeRequest, eq(deckChangeRequest.branchId, deckBranch.id))
    .where(eq(deckBranch.teamId, teamId))
    .orderBy(desc(deckBranch.updatedAt));

  return c.json({ data: rows });
});

