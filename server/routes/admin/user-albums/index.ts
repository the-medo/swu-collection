import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { userAlbumService } from '../../../lib/user-albums/service.ts';
import { UserFileError } from '../../../lib/user-files/errors.ts';
import { moderateAlbumEventLinkInput, userAlbumListQuery } from '../../../../types/UserAlbum.ts';

export function createAlbumModerationRoute(service = userAlbumService, authorize = requireAdmin) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof UserFileError) return c.json({ message: error.message }, error.status);
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
    .get('/blocked', zValidator('query', userAlbumListQuery), async c => {
      const query = c.req.valid('query');
      const cursor =
        query.beforeCreatedAt && query.beforeId
          ? { beforeCreatedAt: query.beforeCreatedAt, beforeId: query.beforeId }
          : undefined;
      return c.json({ data: await service.blockedEventAlbums(cursor) });
    })
    .post(
      '/:id/event-link',
      bodyLimit({ maxSize: 2000, onError: c => c.json({ message: 'Request is too large.' }, 413) }),
      zValidator('param', z.object({ id: z.uuid() })),
      zValidator('json', moderateAlbumEventLinkInput),
      async c =>
        c.json({
          data: await service.moderateEventLink(c.req.valid('param').id, c.req.valid('json')),
        }),
    );
}
export const albumModerationRoute = createAlbumModerationRoute();
