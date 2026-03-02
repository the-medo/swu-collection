import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zTeamCreateRequest } from '../../../types/ZTeam.ts';
import { db } from '../../db';
import { team as teamTable } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { eq, count } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';

const MAX_TEAMS_PER_USER = 2;

export const teamsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTeamCreateRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const data = c.req.valid('json');

    // Check team limit
    const [membershipCount] = await db
      .select({ count: count() })
      .from(teamMember)
      .where(eq(teamMember.userId, user.id));

    if (membershipCount.count >= MAX_TEAMS_PER_USER) {
      return c.json({ message: `You can be a member of max ${MAX_TEAMS_PER_USER} teams` }, 400);
    }

    // Check shortcut uniqueness
    const existing = await db
      .select({ id: teamTable.id })
      .from(teamTable)
      .where(eq(teamTable.shortcut, data.shortcut))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ message: 'This shortcut is already taken' }, 400);
    }

    // Create team
    const [newTeam] = await db
      .insert(teamTable)
      .values({
        name: data.name,
        shortcut: data.shortcut,
        description: data.description ?? '',
      })
      .returning();

    // Add creator as owner
    await db.insert(teamMember).values({
      teamId: newTeam.id,
      userId: user.id,
      role: 'owner',
    });

    return c.json({ data: newTeam }, 201);
  },
);
