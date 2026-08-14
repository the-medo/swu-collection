import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { deckChangeRequest } from '../../../../../../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../../../../../../db/schema/deck_change_request_event.ts';
import { getTeamMembership } from '../../../../../../lib/getTeamMembership.ts';
import { zDeckChangeRequestCommentRequest } from '../../../../../../../types/ZDeckBranch.ts';

export const teamsIdChangeRequestsRequestIdCommentsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckChangeRequestCommentRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const requestId = z.guid().parse(c.req.param('requestId'));
    const data = c.req.valid('json');

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to comment on change requests' }, 403);
    }

    const [request] = await db
      .select()
      .from(deckChangeRequest)
      .where(and(eq(deckChangeRequest.id, requestId), eq(deckChangeRequest.teamId, teamId)))
      .limit(1);

    if (!request) return c.json({ message: 'Change request not found' }, 404);
    if (request.status !== 'open') {
      return c.json({ message: 'Change request is not open' }, 400);
    }

    const [event] = await db
      .insert(deckChangeRequestEvent)
      .values({
        changeRequestId: requestId,
        actorUserId: user.id,
        type: 'commented',
        payload: {
          changeKey: data.changeKey,
          body: data.body,
        },
      })
      .returning();

    await db
      .update(deckChangeRequest)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(deckChangeRequest.id, requestId));

    return c.json({ data: event }, 201);
  },
);
