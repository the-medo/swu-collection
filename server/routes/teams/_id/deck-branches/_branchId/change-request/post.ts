import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { deckBranch } from '../../../../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../../../../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../../../../../../db/schema/deck_change_request_event.ts';
import { getTeamMembership } from '../../../../../../lib/getTeamMembership.ts';
import { zDeckChangeRequestCreateRequest } from '../../../../../../../types/ZDeckBranch.ts';

export const teamsIdDeckBranchesBranchIdChangeRequestPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckChangeRequestCreateRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const branchId = z.guid().parse(c.req.param('branchId'));
    const data = c.req.valid('json');

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to submit change requests' }, 403);
    }

    const [branch] = await db
      .select()
      .from(deckBranch)
      .where(and(eq(deckBranch.id, branchId), eq(deckBranch.teamId, teamId)))
      .limit(1);
    if (!branch) return c.json({ message: 'Branch not found' }, 404);
    if (branch.creatorUserId !== user.id) {
      return c.json({ message: 'Only the branch creator can submit a change request' }, 403);
    }
    if (branch.status !== 'open') return c.json({ message: 'Branch is not open' }, 400);

    const [existingOpen] = await db
      .select()
      .from(deckChangeRequest)
      .where(and(eq(deckChangeRequest.branchId, branchId), eq(deckChangeRequest.status, 'open')))
      .limit(1);
    if (existingOpen) return c.json({ data: existingOpen }, 200);

    const request = await db.transaction(async tx => {
      const [created] = await tx
        .insert(deckChangeRequest)
        .values({
          teamId,
          branchId,
          baseDeckId: branch.baseDeckId,
          branchDeckId: branch.branchDeckId,
          authorUserId: user.id,
          title: data.title,
          description: data.description ?? '',
        })
        .returning();

      await tx.insert(deckChangeRequestEvent).values({
        changeRequestId: created.id,
        actorUserId: user.id,
        type: 'submitted',
        payload: {},
      });

      return created;
    });

    return c.json({ data: request }, 201);
  },
);
