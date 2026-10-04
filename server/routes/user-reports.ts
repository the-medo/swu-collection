import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { createUserReportSchema } from '../../shared/types/userReports.ts';
import { submitUserReport, UserReportError } from '../lib/user-reports/service.ts';

export function createUserReportsRoute(submit = submitUserReport) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      if (c.req.method === 'POST' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .post(
      '/',
      bodyLimit({
        maxSize: 16_000,
        onError: c => c.json({ message: 'Report is too large.' }, 413),
      }),
      zValidator('json', createUserReportSchema),
      async c => {
        try {
          return c.json({ data: await submit(c.get('user')!.id, c.req.valid('json')) }, 201);
        } catch (error) {
          if (!(error instanceof UserReportError)) throw error;
          if (error.retryAfter) c.header('Retry-After', String(error.retryAfter));
          return c.json({ message: error.message }, error.status);
        }
      },
    );
}

export const userReportsRoute = createUserReportsRoute();
