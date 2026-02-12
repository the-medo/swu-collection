import { Hono } from 'hono';
import { db } from '../../../../db';
import { teamJoinRequest } from '../../../../db/schema/team_join_request.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { eq, and } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';

export const teamsIdJoinRequestGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));

  // Check ownership
  const membership = await getTeamMembership(teamId, user.id);

  if (!membership || membership.role !== 'owner') {
    return c.json({ message: 'Only team owners can view join requests' }, 403);
  }

  const requests = await db
    .select({
      id: teamJoinRequest.id,
      userId: teamJoinRequest.userId,
      status: teamJoinRequest.status,
      createdAt: teamJoinRequest.createdAt,
      userName: userTable.name,
      userImage: userTable.image,
    })
    .from(teamJoinRequest)
    .innerJoin(userTable, eq(teamJoinRequest.userId, userTable.id))
    .where(and(eq(teamJoinRequest.teamId, teamId), eq(teamJoinRequest.status, 'pending')));

  return c.json({ data: requests });
});
