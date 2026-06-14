import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { team as teamTable } from '../../../db/schema/team.ts';
import { teamMember } from '../../../db/schema/team_member.ts';
import { getTeamMembership } from '../../../lib/getTeamMembership.ts';

export const teamsIdDeleteRoute = new Hono<AuthExtension>().delete('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));

  const membership = await getTeamMembership(teamId, user.id);
  if (!membership || membership.role !== 'owner') {
    return c.json({ message: 'Only team owners can delete teams' }, 403);
  }

  const members = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId));

  const onlyCurrentUserIsMember = members.length === 1 && members[0]?.userId === user.id;
  if (!onlyCurrentUserIsMember) {
    return c.json(
      { message: 'Kick all other players out of the team before deleting it' },
      400,
    );
  }

  await db.delete(teamTable).where(eq(teamTable.id, teamId));

  return c.json({ data: { success: true } });
});
