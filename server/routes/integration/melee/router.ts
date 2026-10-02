import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { meleeChallengeInputSchema } from '../../../../shared/lib/meleeConnection.ts';
import type { meleeConnectionService } from '../../../lib/melee/connection.ts';
import { MeleeConnectionError } from '../../../lib/melee/profile.ts';

export function createMeleeConnectionRouter(service: typeof meleeConnectionService) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      await next();
    })
    .onError((error, c) => {
      if (error instanceof MeleeConnectionError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .get('/', async c => c.json({ data: await service.status(c.get('user')!.id) }))
    .post('/challenge', zValidator('json', meleeChallengeInputSchema), async c =>
      c.json({ data: await service.start(c.get('user')!.id, c.req.valid('json').username) }),
    )
    .post('/verify', async c => c.json({ data: await service.verify(c.get('user')!.id) }))
    .delete('/', async c => c.json({ data: await service.disconnect(c.get('user')!.id) }));
}
