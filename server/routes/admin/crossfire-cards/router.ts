import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ZodError } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import {
  cardReleaseSelectionSchema,
  cardReleaseActivationSchema,
} from '../../../../shared/types/crossfire-card-releases.ts';
import { CardBundleError } from '../../../../play/storage/card-bundles.ts';
import { ReleaseStorageError } from '../../../../play/releases/storage.ts';
import type { CrossfireCardReleases } from '../../../lib/crossfire/cardReleases.ts';
export function createCardReleaseRouter(
  service: () => CrossfireCardReleases,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      const auth = await authorize(c);
      if (auth.response) return auth.response;
      await next();
    })
    .onError((error, c) => {
      if (error instanceof CardBundleError) return c.json({ message: error.message }, 409);
      if (error instanceof ReleaseStorageError) return c.json({ message: error.message }, 502);
      if (error instanceof ZodError)
        return c.json({ message: 'Card release failed data validation.' }, 400);
      throw error;
    })
    .get('/', async c => c.json({ data: await service().status() }))
    .post('/preview', zValidator('json', cardReleaseSelectionSchema), async c =>
      c.json({ data: await service().preview(c.req.valid('json')) }),
    )
    .post('/activate', zValidator('json', cardReleaseActivationSchema), async c => {
      await service().activate(c.req.valid('json'));
      return c.json({ data: { activated: true } });
    });
}
