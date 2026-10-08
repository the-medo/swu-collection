import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { requireAdmin } from '../auth/requireAdmin.ts';
import { BattlefieldError } from '../lib/battlefield/service.ts';
import { battlefieldPresetService } from '../lib/battlefield/presets.ts';
import {
  battlefieldPresetCreateSchema,
  battlefieldPresetSaveSchema,
  battlefieldShowcaseQuerySchema,
} from '../../shared/types/battlefield.ts';

export function createBattlefieldPresetsRoute(
  service = battlefieldPresetService,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof BattlefieldError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      if (c.req.method !== 'GET') {
        const admin = await authorize(c);
        if (admin.response) return admin.response;
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
      }
      await next();
    })
    .use(
      '*',
      bodyLimit({ maxSize: 500000, onError: c => c.json({ message: 'Request too large.' }, 413) }),
    )
    .get('/', zValidator('query', battlefieldShowcaseQuerySchema), async c => {
      const { page, ...filters } = c.req.valid('query');
      const user = c.get('user');
      if (filters.withinCredits) {
        c.header('Cache-Control', 'private, no-store');
        if (!user) return c.json({ message: 'Sign in to filter by your credits.' }, 401);
      }
      return c.json({
        data: await service.list(page, filters, filters.withinCredits ? user!.id : undefined),
      });
    })
    .get('/:id', zValidator('param', z.object({ id: z.uuid() })), async c =>
      c.json({ data: await service.get(c.req.valid('param').id) }),
    )
    .post('/', zValidator('json', battlefieldPresetCreateSchema), async c =>
      c.json({ data: await service.create(c.req.valid('json')) }, 201),
    )
    .patch(
      '/:id',
      zValidator('param', z.object({ id: z.uuid() })),
      zValidator('json', battlefieldPresetSaveSchema),
      async c => c.json({ data: await service.save(c.req.valid('param').id, c.req.valid('json')) }),
    )
    .delete('/:id', zValidator('param', z.object({ id: z.uuid() })), async c =>
      c.json({ data: await service.remove(c.req.valid('param').id) }),
    );
}
export const battlefieldPresetsRoute = createBattlefieldPresetsRoute();
