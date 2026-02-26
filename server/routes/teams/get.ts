import { Hono } from 'hono';
import { db } from '../../db';
import { team as teamTable, type Team } from '../../db/schema/team.ts';
import { teamMember, type TeamMember } from '../../db/schema/team_member.ts';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';

export const teamsGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const teams = await db
    .select({
      id: teamTable.id,
      name: teamTable.name,
      shortcut: teamTable.shortcut,
      description: teamTable.description,
      logoUrl: teamTable.logoUrl,
      privacy: teamTable.privacy,
      createdAt: teamTable.createdAt,
      role: teamMember.role,
    })
    .from(teamMember)
    .innerJoin(teamTable, eq(teamMember.teamId, teamTable.id))
    .where(eq(teamMember.userId, user.id));

  return c.json({ data: teams });
});

export type UserTeam = Pick<
  Team,
  'id' | 'name' | 'shortcut' | 'description' | 'logoUrl' | 'privacy' | 'createdAt'
> &
  Pick<TeamMember, 'role'>;
