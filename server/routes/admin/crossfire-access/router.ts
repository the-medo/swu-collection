import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import {
  crossfireAccessQuery,
  crossfireAccessParams,
  crossfireAccessChange,
} from '../../../../shared/types/crossfire-access.ts';
import { CrossfireAccessError, type CrossfireAccess } from '../../../lib/crossfire/access.ts';
export function createCrossfireAccessRouter(
  service: () => CrossfireAccess,
  origin: string | undefined,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const access = await authorize(c);
      if (access.response) return access.response;
      if (!c.get('session')) return c.json({ message: 'Unauthorized' }, 401);
      if (
        c.req.method !== 'GET' &&
        c.req.method !== 'HEAD' &&
        (!origin || c.req.header('Origin') !== origin)
      )
        return c.json({ message: 'Forbidden origin' }, 403);
      await next();
    })
    .use('*', async (c, next) => {
      if (c.req.raw.body) {
        const reader = c.req.raw.body.getReader(),
          chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 1024) {
              await reader.cancel();
              return c.json({ message: 'Request too large' }, 413);
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        c.req.raw = new Request(c.req.raw, { body: Buffer.concat(chunks) });
      }
      await next();
    })
    .onError((error, c) => {
      if (error instanceof CrossfireAccessError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .get('/', zValidator('query', crossfireAccessQuery), async c =>
      c.json({
        data: await service().list(
          { userId: c.get('user')!.id, sessionId: c.get('session')!.id },
          c.req.valid('query').search,
        ),
      }),
    )
    .patch(
      '/:userId',
      zValidator('param', crossfireAccessParams),
      zValidator('json', crossfireAccessChange),
      async c =>
        c.json({
          data: await service().set(
            { userId: c.get('user')!.id, sessionId: c.get('session')!.id },
            c.req.valid('param').userId,
            c.req.valid('json').enabled,
          ),
        }),
    );
}
