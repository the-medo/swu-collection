import { Hono } from 'hono';
import { db } from '../../../db';
import { team as teamTable } from '../../../db/schema/team.ts';
import { teamJoinRequest } from '../../../db/schema/team_join_request.ts';
import { eq, and, inArray, desc } from 'drizzle-orm';
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

  // If not a member, check if user has a join request (pending or rejected)
  let joinRequest = null;
  if (user && !membership) {
    const [existingRequest] = await db
      .select({
        id: teamJoinRequest.id,
        status: teamJoinRequest.status,
        createdAt: teamJoinRequest.createdAt,
      })
      .from(teamJoinRequest)
      .where(
        and(
          eq(teamJoinRequest.teamId, teamData.id),
          eq(teamJoinRequest.userId, user.id),
          inArray(teamJoinRequest.status, ['pending', 'rejected']),
        ),
      )
      .orderBy(desc(teamJoinRequest.createdAt))
      .limit(1);

    if (existingRequest) {
      joinRequest = existingRequest;
    }
  }

  return c.json({
    data: {
      ...teamData,
      membership: membership ? { role: membership.role, joinedAt: membership.joinedAt } : null,
      joinRequest,
    },
  });
});
