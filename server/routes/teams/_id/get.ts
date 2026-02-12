import { Hono } from 'hono';
import { db } from '../../../db';
import { team as teamTable } from '../../../db/schema/team.ts';
import { teamMember } from '../../../db/schema/team_member.ts';
import { eq, or, and } from 'drizzle-orm';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const teamsIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const idOrShortcut = z.string().parse(c.req.param('id'));
  const user = c.get('user');

  const condition = isUuid(idOrShortcut)
    ? eq(teamTable.id, idOrShortcut)
    : eq(teamTable.shortcut, idOrShortcut);

  const [teamData] = await db.select().from(teamTable).where(condition).limit(1);

  if (!teamData) {
    return c.json({ message: 'Team not found' }, 404);
  }

  // Check if the current user is a member
  let membership = null;
  if (user) {
    const [member] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamData.id), eq(teamMember.userId, user.id)))
      .limit(1);
    membership = member ?? null;
  }

  return c.json({
    data: {
      ...teamData,
      membership: membership ? { role: membership.role, joinedAt: membership.joinedAt } : null,
    },
  });
});
