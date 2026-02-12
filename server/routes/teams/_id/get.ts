import { Hono } from 'hono';
import { db } from '../../../db';
import { team as teamTable } from '../../../db/schema/team.ts';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { getTeamMembership } from '../../../lib/getTeamMembership.ts';

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
  const membership = user ? await getTeamMembership(teamData.id, user.id) : null;

  return c.json({
    data: {
      ...teamData,
      membership: membership ? { role: membership.role, joinedAt: membership.joinedAt } : null,
    },
  });
});
