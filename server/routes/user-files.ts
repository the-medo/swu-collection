import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { userFilesQuery, userFileUploadInput } from '../../types/UserFile.ts';
import { userFileService } from '../lib/user-files/service.ts';
import { UserFileError } from '../lib/user-files/errors.ts';
import { readUserFileBody } from '../lib/user-files/body.ts';
import { withUserFileMutation } from '../lib/user-files/admission.ts';
const idParams = z.object({ id: z.uuid() });

export function createUserFilesRoute(service = userFileService) {
  return (
    new Hono<AuthExtension>()
      .onError((error, c) => {
        c.header('Cache-Control', 'no-store');
        if (error instanceof UserFileError) return c.json({ message: error.message }, error.status);
        if (error instanceof HTTPException && error.status < 500)
          return c.json(
            {
              message:
                error.status === 413 ? 'Images must be 10 MB or smaller.' : 'Invalid request.',
            },
            error.status,
          );
        c.error = new Error('Could not process this user image.');
        return c.json({ message: 'Could not process this image. Please try again.' }, 500);
      })
      // Images are shareable; ownership is required only for library management.
      .get(
        '/:id/:variant',
        zValidator('param', idParams.extend({ variant: z.enum(['image', 'thumbnail']) })),
        async c => {
          const { id, variant } = c.req.valid('param');
          const result = await service.read(id, variant === 'thumbnail');
          c.header('Cache-Control', 'public, max-age=300');
          return c.redirect(result.redirect, 302);
        },
      )
      .use('*', async (c, next) => {
        c.header('Cache-Control', 'private, no-store');
        c.header('Vary', 'Cookie');
        if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
        if (
          !['GET', 'HEAD'].includes(c.req.method) &&
          c.req.header('X-Requested-With') !== 'swubase'
        )
          return c.json({ message: 'Invalid request origin.' }, 403);
        await next();
      })
      .get('/', zValidator('query', userFilesQuery), async c =>
        c.json({ data: await service.list(c.get('user')!.id, c.req.valid('query').page) }),
      )
      .post(
        '/',
        async (c, next) => withUserFileMutation(c.get('user')!.id, 'upload', next),
        async (c, next) => {
          c.req.bodyCache.arrayBuffer = await readUserFileBody(c.req.raw);
          await next();
        },
        zValidator('form', userFileUploadInput),
        async c =>
          c.json({ data: await service.create(c.get('user')!.id, c.req.valid('form').file) }, 201),
      )
      .delete(
        '/:id',
        async (c, next) => withUserFileMutation(c.get('user')!.id, 'delete', next),
        zValidator('param', idParams),
        async c =>
          c.json({ data: await service.remove(c.get('user')!.id, c.req.valid('param').id) }),
      )
  );
}
export const userFilesRoute = createUserFilesRoute();
