import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { zTeamJoinRequestAction } from '../../../../../../types/ZTeam.ts';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { handleJoinRequest } from '../../../../../lib/teams/membership.ts';

export const teamsIdJoinRequestRequestIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', z.object({ id: z.uuid(), requestId: z.uuid() })),
  zValidator('json', zTeamJoinRequestAction),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const { id: teamId, requestId } = c.req.valid('param');
    const { status } = c.req.valid('json');
    const result = await handleJoinRequest(teamId, requestId, user.id, status);
    if (result.status !== 200) return c.json({ message: result.message }, result.status);
    return c.json({ data: result.data });
  },
);
