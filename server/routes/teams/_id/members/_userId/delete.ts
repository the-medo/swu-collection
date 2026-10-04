import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { removeTeamMember } from '../../../../../lib/teams/membership.ts';

export const teamsIdMembersUserIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', z.object({ id: z.uuid(), userId: z.string().min(1) })),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const { id: teamId, userId } = c.req.valid('param');
    const result = await removeTeamMember(teamId, userId, user.id);
    if (result.status !== 200) return c.json({ message: result.message }, result.status);
    return c.json({ data: result.data });
  },
);
