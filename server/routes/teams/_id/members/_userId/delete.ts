import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { getTeamMembership } from '../../../../../lib/getTeamMembership.ts';
import { teamMember } from '../../../../../db/schema/team_member.ts';
import { db } from '../../../../../db';

export const teamsIdMembersUserIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const userId = z.string().parse(c.req.param('userId'));

  const membership = await getTeamMembership(teamId, user.id);
  if (!membership || membership.role !== 'owner') {
    return c.json({ message: 'Only owners can remove members' }, 403);
  }

  const isSelfKick = user.id === userId;

  if (isSelfKick) {
    const allMembers = await db
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId));

    if (allMembers.length <= 1) {
      return c.json({ message: 'You cannot leave the team as the last member' }, 400);
    }
  }

  const targetMembership = await getTeamMembership(teamId, userId);
  if (!targetMembership) {
    return c.json({ message: 'User is not a member of this team' }, 404);
  }

  await db
    .delete(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));

  return c.json({ data: { success: true } });
});
