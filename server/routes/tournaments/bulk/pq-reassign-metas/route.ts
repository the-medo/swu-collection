import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { pqMetaReassignmentService } from '../../../../lib/tournaments/pqMetaReassignment.ts';
import { PQMetaReassignmentError } from '../../../../lib/tournaments/pqMetaReassignmentPlan.ts';
import {
  zPQMetaReassignmentApplyRequest,
  zPQMetaReassignmentRequest,
} from '../../../../../types/PQMetaReassignment.ts';

export function createPQMetaReassignmentRoute(
  service = pqMetaReassignmentService,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      const access = await authorize(c);
      if (access.response) return access.response;
      c.header('Cache-Control', 'no-store');
      await next();
    })
    .onError((error, c) => {
      if (error instanceof PQMetaReassignmentError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .post('/preview', zValidator('json', zPQMetaReassignmentRequest), async c =>
      c.json({ data: await service.preview(c.req.valid('json')) }),
    )
    .post('/apply', zValidator('json', zPQMetaReassignmentApplyRequest), async c =>
      c.json({ data: await service.apply(c.req.valid('json')) }),
    );
}

export const pqMetaReassignmentRoute = createPQMetaReassignmentRoute();
