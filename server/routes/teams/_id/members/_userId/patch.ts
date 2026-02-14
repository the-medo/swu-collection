import { Hono } from 'hono';
import { db } from '../../../../../db';
import { teamMember } from '../../../../../db/schema/team_member.ts';
import { eq, and } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../../../lib/getTeamMembership.ts';

const patchBodySchema = z.object({
  role: z.enum(['owner', 'member']),
});

export const teamsIdMembersUserIdPatchRoute = new Hono<AuthExtension>().patch('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));
  const userId = z.string().parse(c.req.param('userId'));

  const body = patchBodySchema.parse(await c.req.json());

  const membership = await getTeamMembership(teamId, user.id);
  if (!membership || membership.role !== 'owner') {
    return c.json({ message: 'Only owners can change member roles' }, 403);
  }

  const targetMembership = await getTeamMembership(teamId, userId);
  if (!targetMembership) {
    return c.json({ message: 'User is not a member of this team' }, 404);
  }

  if (targetMembership.role === body.role) {
    return c.json({ message: `User already has the role "${body.role}"` }, 400);
  }

  await db
    .update(teamMember)
    .set({ role: body.role })
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));

  return c.json({ data: { success: true } });
});
