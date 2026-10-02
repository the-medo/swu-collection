import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { listResourceSubmissions } from '../../../lib/live-tournaments/resourceSubmissions.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  deleteResourceSubmission,
  ResourceSubmissionError,
  updateResourceSubmission,
} from '../../../lib/live-tournaments/resourceSubmissionModeration.ts';

const params = z.object({ resourceId: z.guid() });

export function createResourceSubmissionsRoute(
  list = listResourceSubmissions,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof ResourceSubmissionError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const admin = await authorize(c);
      if (admin.response) return admin.response;
      await next();
    })
    .get('/', async c => c.json({ data: await list() }))
    .patch(
      '/:resourceId',
      zValidator('param', params),
      zValidator('json', z.object({ approved: z.boolean() })),
      async c => {
        const resource = await updateResourceSubmission(
          c.req.valid('param').resourceId,
          c.req.valid('json').approved,
        );
        return c.json({ data: resource });
      },
    )
    .delete('/:resourceId', zValidator('param', params), async c => {
      await deleteResourceSubmission(c.req.valid('param').resourceId);
      return c.body(null, 204);
    });
}

export const resourceSubmissionsRoute = createResourceSubmissionsRoute();
