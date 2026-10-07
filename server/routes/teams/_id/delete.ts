import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { deleteTeam } from '../../../lib/teams/membership.ts';

export const teamsIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', z.object({ id: z.uuid() })),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    // A saved header may need a bounded R2 deletion after the database commit.
    const server = c.env as Partial<Pick<Bun.Server<unknown>, 'timeout'>>;
    server?.timeout?.(c.req.raw, 60);
    const result = await deleteTeam(c.req.valid('param').id, user.id);
    if (result.status !== 200) return c.json({ message: result.message }, result.status);
    return c.json({ data: result.data });
  },
);
