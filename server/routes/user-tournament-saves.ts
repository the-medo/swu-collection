import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { tournamentSaveInput } from '../../types/UserTournamentSave.ts';
import { tournamentSaveService } from '../lib/tournaments/saves.ts';

const params = z.object({ tournamentId: z.uuid() });

export function createUserTournamentSavesRoute(service = tournamentSaveService) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      await next();
    })
    .get('/', async c => c.json({ data: await service.list(c.get('user')!.id) }))
    .put(
      '/:tournamentId',
      zValidator('param', params),
      zValidator('json', tournamentSaveInput),
      async c => {
        const saved = await service.save(
          c.get('user')!.id,
          c.req.valid('param').tournamentId,
          c.req.valid('json').status,
        );
        return saved ? c.json({ data: saved }) : c.json({ message: 'Tournament not found.' }, 404);
      },
    )
    .delete('/:tournamentId', zValidator('param', params), async c => {
      const { tournamentId } = c.req.valid('param');
      await service.remove(c.get('user')!.id, tournamentId);
      return c.json({ data: { tournamentId } });
    });
}

export const userTournamentSavesRoute = createUserTournamentSavesRoute();
