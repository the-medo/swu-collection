import { Hono } from 'hono';
import { db } from '../../../../db';
import { teamMember } from '../../../../db/schema/team_member.ts';
import { teamJoinRequest } from '../../../../db/schema/team_join_request.ts';
import { eq, and, count } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';

const MAX_TEAMS_PER_USER = 2;

export const teamsIdJoinRequestPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));

  // Check if already a member
  const existingMember = await getTeamMembership(teamId, user.id);

  if (existingMember) {
    return c.json({ message: 'You are already a member of this team' }, 400);
  }

  // Check team limit
  const [membershipCount] = await db
    .select({ count: count() })
    .from(teamMember)
    .where(eq(teamMember.userId, user.id));

  if (membershipCount.count >= MAX_TEAMS_PER_USER) {
    return c.json({ message: `You can be a member of max ${MAX_TEAMS_PER_USER} teams` }, 400);
  }

  // Check if already has a pending request
  const [existingRequest] = await db
    .select()
    .from(teamJoinRequest)
    .where(
      and(
        eq(teamJoinRequest.teamId, teamId),
        eq(teamJoinRequest.userId, user.id),
        eq(teamJoinRequest.status, 'pending'),
      ),
    )
    .limit(1);

  if (existingRequest) {
    return c.json({ message: 'You already have a pending request for this team' }, 400);
  }

  // Check if a previous request was rejected
  const [rejectedRequest] = await db
    .select()
    .from(teamJoinRequest)
    .where(
      and(
        eq(teamJoinRequest.teamId, teamId),
        eq(teamJoinRequest.userId, user.id),
        eq(teamJoinRequest.status, 'rejected'),
      ),
    )
    .limit(1);

  if (rejectedRequest) {
    return c.json(
      { message: 'Your previous request was rejected. You cannot send a new request' },
      400,
    );
  }

  const [request] = await db
    .insert(teamJoinRequest)
    .values({
      teamId,
      userId: user.id,
    })
    .returning();

  return c.json({ data: request }, 201);
});
