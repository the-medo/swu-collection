import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../../../../db';
import { zTeamJoinRequestAction } from '../../../../../../types/ZTeam.ts';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { teamMember } from '../../../../../db/schema/team_member.ts';
import { teamJoinRequest } from '../../../../../db/schema/team_join_request.ts';
import { getTeamMembership } from '../../../../../lib/getTeamMembership.ts';

export const teamsIdJoinRequestRequestIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('json', zTeamJoinRequestAction),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const requestId = z.guid().parse(c.req.param('requestId'));
    const { status } = c.req.valid('json');

    // Check ownership
    const membership = await getTeamMembership(teamId, user.id);

    if (!membership || membership.role !== 'owner') {
      return c.json({ message: 'Only team owners can handle join requests' }, 403);
    }

    // Find the pending request
    const [request] = await db
      .select()
      .from(teamJoinRequest)
      .where(
        and(
          eq(teamJoinRequest.id, requestId),
          eq(teamJoinRequest.teamId, teamId),
          eq(teamJoinRequest.status, 'pending'),
        ),
      )
      .limit(1);

    if (!request) {
      return c.json({ message: 'Join request not found or already handled' }, 404);
    }

    // Update request status
    const [updated] = await db
      .update(teamJoinRequest)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(teamJoinRequest.id, requestId))
      .returning();

    // If approved, add user as member
    if (status === 'approved') {
      await db.insert(teamMember).values({
        teamId,
        userId: request.userId,
        role: 'member',
      });
    }

    return c.json({ data: updated });
  },
);
