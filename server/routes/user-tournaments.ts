import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import type { meleeTournamentService } from '../lib/melee/tournaments.ts';
import { MeleeConnectionError } from '../lib/melee/profile.ts';

const params = z.object({ id: z.string().min(1).max(200) });

export function createUserTournamentsRouter(service: typeof meleeTournamentService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof MeleeConnectionError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .get('/:id/tournaments', zValidator('param', params), async c => {
      c.header('Cache-Control', 'no-store');
      return c.json({ data: await service.get(c.req.valid('param').id) });
    })
    .post('/:id/tournaments/refresh', zValidator('param', params), async c => {
      c.header('Cache-Control', 'no-store');
      const owner = c.get('user');
      if (!owner) return c.json({ message: 'Unauthorized' }, 401);
      if (owner.id !== c.req.valid('param').id)
        return c.json({ message: 'Only the profile owner can refresh tournaments.' }, 403);
      return c.json({ data: await service.refresh(owner.id) });
    });
}
