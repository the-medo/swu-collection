import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { userAvatarInputSchema } from '../../../../types/UserAvatar.ts';
import { saveUserAvatar } from '../../../lib/user-avatar/service.ts';
import { AvatarError } from '../../../lib/user-avatar/image.ts';

type UserAvatarEnv = AuthExtension & {
  Bindings: Partial<Pick<Bun.Server<unknown>, 'timeout'>>;
};

export function createUserAvatarRoute(save = saveUserAvatar, now = Date.now) {
  const buckets = new Map<string, { until: number; used: number }>();
  const pending = new Set<string>();
  let nextSweep = 0;
  return new Hono<UserAvatarEnv>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      if (c.req.header('X-Requested-With') !== 'swubase') {
        return c.json({ message: 'Invalid request origin.' }, 403);
      }
      await next();
    })
    .post(
      '/',
      bodyLimit({ maxSize: 4096, onError: c => c.json({ message: 'Request too large.' }, 413) }),
      zValidator('json', userAvatarInputSchema),
      async c => {
        const userId = c.get('user')!.id;
        const time = now();
        if (time >= nextSweep) {
          for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id);
          nextSweep = time + 60_000;
        }
        let bucket = buckets.get(userId);
        if (bucket && bucket.until <= time) {
          buckets.delete(userId);
          bucket = undefined;
        }
        if (
          pending.has(userId) ||
          (bucket && bucket.used >= 5) ||
          (!bucket && buckets.size >= 10_000)
        ) {
          c.header(
            'Retry-After',
            String(Math.max(1, Math.ceil(((bucket?.until ?? time + 60_000) - time) / 1000))),
          );
          return c.json({ message: 'Please wait a moment before saving another avatar.' }, 429);
        }
        if (bucket) bucket.used++;
        else buckets.set(userId, { until: time + 60_000, used: 1 });
        pending.add(userId);
        try {
          // Bun passes its server as Hono's environment. Allow the bounded
          // image fetch (15s) and R2 upload (30s) to finish on this request.
          c.env?.timeout?.(c.req.raw, 60);
          return c.json({ data: await save(userId, c.req.valid('json')) });
        } catch (error) {
          if (error instanceof AvatarError) return c.json({ message: error.message }, error.status);
          throw error;
        } finally {
          pending.delete(userId);
        }
      },
    );
}

export const userAvatarPostRoute = createUserAvatarRoute();
