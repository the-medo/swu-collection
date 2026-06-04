import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckBranch } from '../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../db/schema/deck_change_request.ts';
import { team as teamTable } from '../../../../db/schema/team.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { selectUser } from '../../../user.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { isAdminUser } from '../../../../lib/decks/deckBranchAccess.ts';

export const deckIdBranchesGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const deckId = z.guid().parse(c.req.param('id'));
  const isAdmin = await isAdminUser(user.id);

  const [baseDeck] = await db.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1);
  if (!baseDeck) return c.json({ message: "Deck doesn't exist" }, 404);

  const rows = await db
    .select({
      branch: deckBranch,
      branchDeck: deckTable,
      creator: selectUser,
      team: {
        id: teamTable.id,
        name: teamTable.name,
        shortcut: teamTable.shortcut,
      },
      changeRequest: deckChangeRequest,
    })
    .from(deckBranch)
    .innerJoin(deckTable, eq(deckBranch.branchDeckId, deckTable.id))
    .innerJoin(userTable, eq(deckBranch.creatorUserId, userTable.id))
    .innerJoin(teamTable, eq(deckBranch.teamId, teamTable.id))
    .leftJoin(
      deckChangeRequest,
      and(eq(deckChangeRequest.branchId, deckBranch.id), eq(deckChangeRequest.status, 'open')),
    )
    .where(and(eq(deckBranch.baseDeckId, deckId), eq(deckBranch.status, 'open')))
    .orderBy(desc(deckBranch.updatedAt));

  if (baseDeck.userId === user.id || isAdmin) {
    return c.json({ data: rows });
  }

  const visibleRows = [];
  for (const row of rows) {
    const membership = await getTeamMembership(row.branch.teamId, user.id);
    if (membership || row.branch.creatorUserId === user.id) visibleRows.push(row);
  }

  return c.json({ data: visibleRows });
});
