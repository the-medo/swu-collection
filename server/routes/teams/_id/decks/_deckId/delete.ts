import { Hono } from 'hono';
import { db } from '../../../../../db';
import { teamDeck } from '../../../../../db/schema/team_deck.ts';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import z from 'zod';
import { getTeamMembership } from '../../../../../lib/getTeamMembership.ts';
import { deckBranch } from '../../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../../../../../db/schema/deck_change_request_event.ts';

export const teamsIdDecksDeckIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const deckId = z.guid().parse(c.req.param('deckId'));

  // Check membership (owner or member)
  const membership = await getTeamMembership(teamId, user.id);

  if (!membership) {
    return c.json({ message: 'You must be a team member to remove decks' }, 403);
  }

  const result = await db.transaction(async tx => {
    const deleted = await tx
      .delete(teamDeck)
      .where(and(eq(teamDeck.teamId, teamId), eq(teamDeck.deckId, deckId)))
      .returning();

    if (deleted.length === 0) return null;

    const branches = await tx
      .select({ id: deckBranch.id })
      .from(deckBranch)
      .where(and(eq(deckBranch.teamId, teamId), eq(deckBranch.baseDeckId, deckId)));
    const branchIds = branches.map(branch => branch.id);

    if (branchIds.length === 0) {
      return { closedChangeRequests: 0, convertedBranches: 0 };
    }

    const openRequests = await tx
      .select({ id: deckChangeRequest.id })
      .from(deckChangeRequest)
      .where(
        and(
          eq(deckChangeRequest.teamId, teamId),
          eq(deckChangeRequest.baseDeckId, deckId),
          eq(deckChangeRequest.status, 'open'),
        ),
      );

    if (openRequests.length > 0) {
      const requestIds = openRequests.map(request => request.id);
      await tx
        .update(deckChangeRequest)
        .set({ status: 'closed', closedAt: sql`NOW()`, updatedAt: sql`NOW()` })
        .where(inArray(deckChangeRequest.id, requestIds));
      await tx.insert(deckChangeRequestEvent).values(
        requestIds.map(requestId => ({
          changeRequestId: requestId,
          actorUserId: user.id,
          type: 'closed' as const,
          payload: { reason: 'team_deck_removed' },
        })),
      );
    }

    await tx.delete(deckBranch).where(inArray(deckBranch.id, branchIds));

    return {
      closedChangeRequests: openRequests.length,
      convertedBranches: branchIds.length,
    };
  });

  if (!result) {
    return c.json({ message: 'Deck not found in this team' }, 404);
  }

  return c.json({
    message: 'Deck removed from team',
    data: result,
  });
});
