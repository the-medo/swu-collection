import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { requireAdmin } from '../auth/requireAdmin.ts';
import { imageGalleryQuery, imageGalleryUploadInput } from '../../types/ImageGallery.ts';
import { imageGalleryService } from '../lib/image-gallery/service.ts';
import { UserFileError } from '../lib/user-files/errors.ts';
import { readUserFileBody } from '../lib/user-files/body.ts';
import { withUserFileMutation } from '../lib/user-files/admission.ts';

export function createImageGalleryRoute(service = imageGalleryService, authorize = requireAdmin) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      c.header('Cache-Control', 'no-store');
      if (error instanceof UserFileError) return c.json({ message: error.message }, error.status);
      if (error instanceof HTTPException && error.status < 500)
        return c.json({ message: 'Invalid image request.' }, error.status);
      c.error = new Error('Could not process this gallery image.');
      return c.json({ message: 'Could not process this image. Please try again.' }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      if (!['GET', 'HEAD'].includes(c.req.method)) {
        const admin = await authorize(c);
        if (admin.response) return admin.response;
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
        const server = c.env as Partial<Pick<Bun.Server<unknown>, 'timeout'>>;
        server?.timeout?.(c.req.raw, 180);
      }
      await next();
    })
    .get('/', zValidator('query', imageGalleryQuery), async c =>
      c.json({ data: await service.list(c.req.valid('query').page) }),
    )
    .post(
      '/',
      async (c, next) => withUserFileMutation(c.get('user')!.id, 'upload', next),
      async (c, next) => {
        c.req.bodyCache.arrayBuffer = await readUserFileBody(c.req.raw);
        await next();
      },
      zValidator('form', imageGalleryUploadInput),
      async c => {
        const { title, file } = c.req.valid('form');
        return c.json({ data: await service.create(title, file) }, 201);
      },
    )
    .delete(
      '/:id',
      async (c, next) => withUserFileMutation(c.get('user')!.id, 'delete', next),
      zValidator('param', z.object({ id: z.uuid() })),
      async c => c.json({ data: await service.remove(c.req.valid('param').id) }),
    );
}

export const imageGalleryRoute = createImageGalleryRoute();
