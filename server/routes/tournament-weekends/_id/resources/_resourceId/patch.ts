import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import {
  updateResourceSubmission,
  ResourceSubmissionError,
} from '../../../../../lib/live-tournaments/resourceSubmissionModeration.ts';

export const tournamentWeekendIdResourcesResourceIdPatchRoute = new Hono<AuthExtension>()
  .onError((error, c) => {
    if (error instanceof ResourceSubmissionError)
      return c.json({ message: error.message }, error.status);
    throw error;
  })
  .patch(
    '/',
    zValidator('param', z.object({ id: z.guid(), resourceId: z.guid() })),
    zValidator('json', z.object({ approved: z.boolean() })),
    async c => {
      const admin = await requireAdmin(c);
      if (admin.response) return admin.response;
      const { id, resourceId } = c.req.valid('param');
      const resource = await updateResourceSubmission(resourceId, c.req.valid('json').approved, id);
      return c.json({ data: resource });
    },
  );
