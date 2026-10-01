import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../auth/auth.ts';
import { homeLocationUpdateSchema } from '../../../shared/lib/userHomeLocation.ts';
import { userHomeLocationService } from '../../lib/userHomeLocation.ts';
import { TournamentLocationError } from '../../lib/tournaments/geocoding.ts';

export function createHomeLocationRoute(service = userHomeLocationService) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401);
      await next();
    })
    .get('/', async c => c.json({ data: await service.get(c.get('user')!.id) }))
    .post('/', zValidator('json', homeLocationUpdateSchema), async c => {
      try {
        return c.json({
          data: await service.save(c.get('user')!.id, c.req.valid('json').location),
        });
      } catch (error) {
        if (error instanceof TournamentLocationError)
          return c.json({ error: error.message }, error.status);
        throw error;
      }
    });
}

export const userHomeLocationRoute = createHomeLocationRoute();
