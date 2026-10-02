import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { z } from 'zod';
import { patchTeamMember } from '../../../../../lib/teams/membership.ts';

const patchBodySchema = z.object({
  role: z.enum(['owner', 'member']).optional(),
  autoAddDeck: z.boolean().optional(),
});

export const teamsIdMembersUserIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', z.object({ id: z.uuid(), userId: z.string().min(1) })),
  zValidator('json', patchBodySchema),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const { id: teamId, userId } = c.req.valid('param');
    const result = await patchTeamMember(teamId, userId, user.id, c.req.valid('json'));
    if (result.status !== 200) return c.json({ message: result.message }, result.status);
    return c.json({ data: result.data });
  },
);
