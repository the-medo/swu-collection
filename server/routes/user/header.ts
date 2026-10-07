import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { userHeaderInputSchema } from '../../../types/UserHeader.ts';
import {
  getUserHeader,
  getUserHeaderSettings,
  saveUserHeader,
} from '../../lib/user-header/service.ts';
import { UserFileError } from '../../lib/user-files/errors.ts';
import { withUserFileMutation } from '../../lib/user-files/admission.ts';

export function createUserHeaderRoute(
  service = { get: getUserHeader, getSettings: getUserHeaderSettings, save: saveUserHeader },
  now = Date.now,
) {
  const buckets = new Map<string, { until: number; used: number }>();
  let nextSweep = 0;
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      c.header('Cache-Control', 'no-store');
      if (error instanceof UserFileError) return c.json({ message: error.message }, error.status);
      if (error instanceof HTTPException && error.status < 500)
        return c.json({ message: 'Invalid header request.' }, error.status);
      c.error = new Error('Could not update this profile header.');
      return c.json({ message: 'Could not update the header. Please try again.' }, 500);
    })
    .use('/:id/header', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      await next();
    })
    .use('/header', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Vary', 'Cookie');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      if (c.req.method === 'POST' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .get(
      '/:id/header',
      zValidator('param', z.object({ id: z.string().min(1).max(200) })),
      async c => c.json({ data: await service.get(c.req.valid('param').id) }),
    )
    .get('/header', async c => c.json({ data: await service.getSettings(c.get('user')!.id) }))
    .post(
      '/header',
      bodyLimit({ maxSize: 2048, onError: c => c.json({ message: 'Request too large.' }, 413) }),
      zValidator('json', userHeaderInputSchema),
      async c => {
        const time = now();
        const userId = c.get('user')!.id;
        if (time >= nextSweep) {
          for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id);
          nextSweep = time + 60_000;
        }
        const bucket = buckets.get(userId);
        if (
          (bucket && bucket.until > time && bucket.used >= 5) ||
          (!bucket && buckets.size >= 10_000)
        ) {
          c.header('Retry-After', '60');
          return c.json({ message: 'Please wait a moment before saving another header.' }, 429);
        }
        buckets.set(
          userId,
          bucket && bucket.until > time
            ? { ...bucket, used: bucket.used + 1 }
            : { until: time + 60_000, used: 1 },
        );
        const server = c.env as Partial<Pick<Bun.Server<unknown>, 'timeout'>>;
        server?.timeout?.(c.req.raw, 120);
        return c.json({
          data: await withUserFileMutation(userId, 'upload', () =>
            service.save(userId, c.req.valid('json')),
          ),
        });
      },
    );
}

export const userHeaderRoute = createUserHeaderRoute();
