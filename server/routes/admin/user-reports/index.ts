import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { reportModeration } from '../../../lib/user-reports/moderation.ts';
import { UserReportError } from '../../../lib/user-reports/service.ts';
import {
  moderationActionSchema,
  reportListSchema,
} from '../../../../shared/types/userReportModeration.ts';

const reportParams = z.object({ reportId: z.uuid() });
const userParams = z.object({ userId: z.string().min(1).max(200) });
export function createReportModerationRoute(service = reportModeration, authorize = requireAdmin) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof UserReportError) return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      const admin = await authorize(c);
      if (admin.response) return admin.response;
      if (c.req.method === 'POST' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .get('/', zValidator('query', reportListSchema), async c =>
      c.json({ data: await service.list(c.req.valid('query')) }),
    )
    .get('/users/:userId', zValidator('param', userParams), async c =>
      c.json({ data: await service.profile(c.req.valid('param').userId) }),
    )
    .get(
      '/users/:userId/actions',
      zValidator('param', userParams),
      zValidator('query', reportListSchema.pick({ page: true })),
      async c =>
        c.json({
          data: await service.history(c.req.valid('param').userId, c.req.valid('query').page),
        }),
    )
    .get('/:reportId', zValidator('param', reportParams), async c =>
      c.json({ data: await service.detail(c.req.valid('param').reportId) }),
    )
    .post(
      '/:reportId/actions',
      bodyLimit({
        maxSize: 16000,
        onError: c => c.json({ message: 'Decision is too large.' }, 413),
      }),
      zValidator('param', reportParams),
      zValidator('json', moderationActionSchema),
      async c =>
        c.json({
          data: await service.act(
            c.get('user')!.id,
            c.req.valid('param').reportId,
            c.req.valid('json'),
          ),
        }),
    );
}
export const reportModerationRoute = createReportModerationRoute();
