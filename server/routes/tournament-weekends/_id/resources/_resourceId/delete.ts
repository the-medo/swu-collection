import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import {
  deleteResourceSubmission,
  ResourceSubmissionError,
} from '../../../../../lib/live-tournaments/resourceSubmissionModeration.ts';

export const tournamentWeekendIdResourcesResourceIdDeleteRoute = new Hono<AuthExtension>()
  .onError((error, c) => {
    if (error instanceof ResourceSubmissionError)
      return c.json({ message: error.message }, error.status);
    throw error;
  })
  .delete('/', zValidator('param', z.object({ id: z.guid(), resourceId: z.guid() })), async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;
    const { id, resourceId } = c.req.valid('param');
    await deleteResourceSubmission(resourceId, id);
    return c.body(null, 204);
  });
