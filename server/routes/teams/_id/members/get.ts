import { Hono } from 'hono';
import { db } from '../../../../db';
import { teamMember } from '../../../../db/schema/team_member.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { eq, and } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';

export const teamsIdMembersGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teamId = z.guid().parse(c.req.param('id'));

  // Check if the requesting user is a member of the team
  const [membership] = await db
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, user.id)))
    .limit(1);

  if (!membership) {
    return c.json({ message: 'You must be a team member to view members' }, 403);
  }

  const members = await db
    .select({
      userId: teamMember.userId,
      role: teamMember.role,
      joinedAt: teamMember.joinedAt,
      name: userTable.name,
      image: userTable.image,
    })
    .from(teamMember)
    .innerJoin(userTable, eq(teamMember.userId, userTable.id))
    .where(eq(teamMember.teamId, teamId));

  return c.json({ data: members });
});
