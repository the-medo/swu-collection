import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { battlefieldService, BattlefieldError } from '../lib/battlefield/service.ts';
import {
  battlefieldCreateSchema,
  battlefieldDraftSchema,
  battlefieldSaveSchema,
} from '../../shared/types/battlefield.ts';

const params = z.object({ id: z.uuid() });
export function createBattlefieldsRoute(service = battlefieldService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof BattlefieldError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      if (c.req.method !== 'GET' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .use(
      '*',
      bodyLimit({ maxSize: 500000, onError: c => c.json({ message: 'Request too large.' }, 413) }),
    )
    .get('/', async c => c.json({ data: await service.editor(c.get('user')!.id) }))
    .post('/', zValidator('json', battlefieldCreateSchema), async c =>
      c.json({ data: await service.create(c.get('user')!.id, c.req.valid('json').name) }, 201),
    )
    .post('/from-draft', zValidator('json', battlefieldDraftSchema), async c =>
      c.json({ data: await service.createFromDraft(c.get('user')!.id, c.req.valid('json')) }, 201),
    )
    .patch(
      '/:id',
      zValidator('param', params),
      zValidator('json', battlefieldSaveSchema),
      async c =>
        c.json({
          data: await service.save(c.get('user')!.id, c.req.valid('param').id, c.req.valid('json')),
        }),
    )
    .post('/:id/duplicate', zValidator('param', params), async c =>
      c.json({ data: await service.duplicate(c.get('user')!.id, c.req.valid('param').id) }, 201),
    )
    .post('/:id/activate', zValidator('param', params), async c =>
      c.json({ data: await service.activate(c.get('user')!.id, c.req.valid('param').id) }),
    );
}
export const battlefieldsRoute = createBattlefieldsRoute();

export function createPublicBattlefieldRoute(service = battlefieldService) {
  return new Hono<AuthExtension>().get(
    '/:id/battlefield',
    zValidator('param', z.object({ id: z.string().min(1).max(200) })),
    async c => {
      c.header('Cache-Control', 'no-store');
      try {
        return c.json({ data: await service.publicProfile(c.req.valid('param').id) });
      } catch (error) {
        if (error instanceof BattlefieldError)
          return c.json({ message: error.message }, error.status);
        throw error;
      }
    },
  );
}
export const publicBattlefieldRoute = createPublicBattlefieldRoute();
