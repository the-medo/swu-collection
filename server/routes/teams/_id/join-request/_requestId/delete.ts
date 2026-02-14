import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../../../../db';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { teamJoinRequest } from '../../../../../db/schema/team_join_request.ts';
import { getTeamMembership } from '../../../../../lib/getTeamMembership.ts';

export const teamsIdJoinRequestRequestIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const requestId = z.guid().parse(c.req.param('requestId'));

    // Check ownership
    const membership = await getTeamMembership(teamId, user.id);

    if (!membership || membership.role !== 'owner') {
      return c.json({ message: 'Only team owners can remove join requests' }, 403);
    }

    // Find the rejected request
    const [request] = await db
      .select()
      .from(teamJoinRequest)
      .where(
        and(
          eq(teamJoinRequest.id, requestId),
          eq(teamJoinRequest.teamId, teamId),
          eq(teamJoinRequest.status, 'rejected'),
        ),
      )
      .limit(1);

    if (!request) {
      return c.json({ message: 'Rejected join request not found' }, 404);
    }

    await db.delete(teamJoinRequest).where(eq(teamJoinRequest.id, requestId));

    return c.json({ message: 'Join request removed successfully' });
  },
);
