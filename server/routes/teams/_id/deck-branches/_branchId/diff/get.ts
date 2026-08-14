import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { deckBranch } from '../../../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../../../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../../../../../../db/schema/deck_change_request_event.ts';
import { user as userTable } from '../../../../../../db/schema/auth-schema.ts';
import { getTeamMembership } from '../../../../../../lib/getTeamMembership.ts';
import { getDeckSnapshot } from '../../../../../../lib/decks/deckBranchSnapshot.ts';
import {
  diffDeckSnapshots,
  findDeckMergeConflicts,
} from '../../../../../../lib/decks/deckBranchDiff.ts';
import { selectUser } from '../../../../../user.ts';

export const teamsIdDeckBranchesBranchIdDiffGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const branchId = z.guid().parse(c.req.param('branchId'));
  const membership = await getTeamMembership(teamId, user.id);
  if (!membership) return c.json({ message: 'You must be a team member to view diffs' }, 403);

  const [branch] = await db
    .select()
    .from(deckBranch)
    .where(and(eq(deckBranch.id, branchId), eq(deckBranch.teamId, teamId)))
    .limit(1);
  if (!branch) return c.json({ message: 'Branch not found' }, 404);

  const branchSnapshot = await getDeckSnapshot(branch.branchDeckId);
  const currentBaseSnapshot = await getDeckSnapshot(branch.baseDeckId);
  if (!branchSnapshot || !currentBaseSnapshot) return c.json({ message: 'Deck not found' }, 404);

  const proposedDiff = diffDeckSnapshots(branch.baseSnapshot, branchSnapshot);
  const ownerDiff = diffDeckSnapshots(branch.baseSnapshot, currentBaseSnapshot);
  const conflicts = findDeckMergeConflicts(
    branch.baseSnapshot,
    currentBaseSnapshot,
    branchSnapshot,
  );
  const [request] = await db
    .select({ id: deckChangeRequest.id })
    .from(deckChangeRequest)
    .where(and(eq(deckChangeRequest.teamId, teamId), eq(deckChangeRequest.branchId, branchId)))
    .orderBy(desc(deckChangeRequest.updatedAt))
    .limit(1);

  const reviewComments = request
    ? await db
        .select({
          event: deckChangeRequestEvent,
          author: selectUser,
        })
        .from(deckChangeRequestEvent)
        .innerJoin(userTable, eq(deckChangeRequestEvent.actorUserId, userTable.id))
        .where(
          and(
            eq(deckChangeRequestEvent.changeRequestId, request.id),
            eq(deckChangeRequestEvent.type, 'commented'),
          ),
        )
        .orderBy(deckChangeRequestEvent.createdAt)
    : [];

  return c.json({
    data: {
      branch,
      snapshots: {
        current: currentBaseSnapshot,
        branch: branchSnapshot,
      },
      proposedDiff,
      ownerDiff,
      reviewComments: reviewComments.map(({ event, author }) => ({
        id: event.id,
        changeKey: String(event.payload.changeKey ?? ''),
        body: String(event.payload.body ?? ''),
        createdAt: event.createdAt,
        author,
      })),
      conflicts,
    },
  });
});
