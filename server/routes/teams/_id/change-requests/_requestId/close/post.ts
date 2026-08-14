import { Hono } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { deck as deckTable } from '../../../../../../db/schema/deck.ts';
import { deckBranch } from '../../../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../../../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../../../../../../db/schema/deck_change_request_event.ts';
import { getTeamMembership } from '../../../../../../lib/getTeamMembership.ts';
import { isAdminUser } from '../../../../../../lib/decks/deckBranchAccess.ts';

export const teamsIdChangeRequestsRequestIdClosePostRoute = new Hono<AuthExtension>().post(
  '/',
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const requestId = z.guid().parse(c.req.param('requestId'));

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to close change requests' }, 403);
    }

    const [row] = await db
      .select({
        changeRequest: deckChangeRequest,
        branch: deckBranch,
        baseDeck: deckTable,
      })
      .from(deckChangeRequest)
      .innerJoin(deckBranch, eq(deckChangeRequest.branchId, deckBranch.id))
      .innerJoin(deckTable, eq(deckChangeRequest.baseDeckId, deckTable.id))
      .where(and(eq(deckChangeRequest.id, requestId), eq(deckChangeRequest.teamId, teamId)))
      .limit(1);

    if (!row) return c.json({ message: 'Change request not found' }, 404);
    if (row.changeRequest.status !== 'open') {
      return c.json({ message: 'Change request is not open' }, 400);
    }

    const isAdmin = await isAdminUser(user.id);
    const canClose =
      isAdmin || row.changeRequest.authorUserId === user.id || row.baseDeck.userId === user.id;
    if (!canClose) return c.json({ message: 'Unauthorized' }, 403);

    await db.transaction(async tx => {
      await tx
        .update(deckChangeRequest)
        .set({ status: 'closed', closedAt: sql`NOW()`, updatedAt: sql`NOW()` })
        .where(eq(deckChangeRequest.id, requestId));
      await tx
        .update(deckBranch)
        .set({ status: 'closed', updatedAt: sql`NOW()` })
        .where(eq(deckBranch.id, row.branch.id));
      await tx.insert(deckChangeRequestEvent).values({
        changeRequestId: requestId,
        actorUserId: user.id,
        type: 'closed',
        payload: {},
      });
    });

    return c.json({ data: { closed: true } });
  },
);
