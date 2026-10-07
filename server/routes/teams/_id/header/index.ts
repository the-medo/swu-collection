import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createMiddleware } from 'hono/factory';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { teamHeaderInputSchema } from '../../../../../types/TeamHeader.ts';
import {
  getTeamHeader,
  getTeamHeaderSettings,
  saveTeamHeader,
} from '../../../../lib/team-header/service.ts';
import { getTeamMembership } from '../../../../lib/getTeamMembership.ts';
import { UserFileError } from '../../../../lib/user-files/errors.ts';
import { withUserFileMutation } from '../../../../lib/user-files/admission.ts';

export function createTeamHeaderRoute(
  service = {
    get: getTeamHeader,
    getSettings: getTeamHeaderSettings,
    save: saveTeamHeader,
    canEdit: async (teamId: string, userId: string) =>
      (await getTeamMembership(teamId, userId))?.role === 'owner',
  },
  now = Date.now,
) {
  const params = zValidator('param', z.object({ id: z.uuid() }));
  const owner = createMiddleware<AuthExtension>(async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    c.header('Vary', 'Cookie');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    if (!(await service.canEdit(c.req.param('id')!, user.id)))
      return c.json({ message: 'Only team owners can update the header.' }, 403);
    await next();
  });
  const buckets = new Map<string, { until: number; used: number }>();
  let nextSweep = 0;
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      c.header('Cache-Control', 'no-store');
      if (error instanceof UserFileError) return c.json({ message: error.message }, error.status);
      if (error instanceof HTTPException && error.status < 500)
        return c.json({ message: 'Invalid header request.' }, error.status);
      const action = c.req.method === 'POST' ? 'update' : 'load';
      c.error = new Error(`Could not ${action} this team header.`);
      return c.json({ message: `Could not ${action} the team header. Please try again.` }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      await next();
    })
    .get('/', params, async c => c.json({ data: await service.get(c.req.valid('param').id) }))
    .get('/settings', params, owner, async c =>
      c.json({ data: await service.getSettings(c.req.valid('param').id, c.get('user')!.id) }),
    )
    .post(
      '/',
      params,
      owner,
      async (c, next) => {
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
        await next();
      },
      bodyLimit({ maxSize: 2048, onError: c => c.json({ message: 'Request too large.' }, 413) }),
      zValidator('json', teamHeaderInputSchema),
      async c => {
        const userId = c.get('user')!.id;
        return withUserFileMutation(userId, 'upload', async () => {
          const time = now();
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
          // Count admitted processing attempts, including failures, to bound costly retries.
          // Busy requests rejected before processing do not spend the account's allowance.
          buckets.set(
            userId,
            bucket && bucket.until > time
              ? { ...bucket, used: bucket.used + 1 }
              : { until: time + 60_000, used: 1 },
          );
          const server = c.env as Partial<Pick<Bun.Server<unknown>, 'timeout'>>;
          server?.timeout?.(c.req.raw, 120);
          return c.json({
            data: await service.save(c.req.valid('param').id, userId, c.req.valid('json')),
          });
        });
      },
    );
}

export const teamsIdHeaderRoute = createTeamHeaderRoute();
