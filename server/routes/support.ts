import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { supportCheckoutInput } from '../../shared/types/support.ts';
import { supportService } from '../lib/stripe/service.ts';
import { logSupportFailure, SupportError } from '../lib/stripe/config.ts';

const receiptParam = z.object({ id: z.uuid() });
export function createSupportRoute(service = supportService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof SupportError) return c.json({ message: error.message }, error.status);
      logSupportFailure(error);
      return c.json(
        { message: 'Support payments are temporarily unavailable. Please try again.' },
        503,
      );
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (c.req.method === 'POST') {
        if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
      }
      await next();
    })
    .get('/', async c => c.json({ data: await service.overview(c.get('user')?.id) }))
    .post(
      '/checkout',
      bodyLimit({ maxSize: 1024, onError: c => c.json({ message: 'Request too large.' }, 413) }),
      zValidator('json', supportCheckoutInput),
      async c => c.json({ data: await service.checkout(c.get('user')!.id, c.req.valid('json')) }),
    )
    .post('/checkout/:id/confirm', zValidator('param', receiptParam), async c =>
      c.json({ data: await service.confirm(c.get('user')!.id, c.req.valid('param').id) }),
    )
    .post('/checkout/:id/cancel', zValidator('param', receiptParam), async c =>
      c.json({ data: await service.cancel(c.get('user')!.id, c.req.valid('param').id) }),
    )
    .post('/portal', async c => c.json({ data: await service.portal(c.get('user')!.id) }));
}
export const supportRoute = createSupportRoute();
