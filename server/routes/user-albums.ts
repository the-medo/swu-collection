import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import {
  albumTournamentSearchQuery,
  userAlbumQuery,
  userAlbumListQuery,
  createUserAlbumInput,
  updateUserAlbumInput,
  albumRevisionInput,
  addAlbumImagesInput,
  updateAlbumImageInput,
} from '../../types/UserAlbum.ts';
import { userAlbumService } from '../lib/user-albums/service.ts';
import { UserFileError } from '../lib/user-files/errors.ts';

const idParams = z.object({ id: z.uuid() });
const imageParams = idParams.extend({ fileId: z.uuid() });
const listCursor = (query: z.infer<typeof userAlbumListQuery>) =>
  query.beforeId && query.beforeCreatedAt
    ? { beforeId: query.beforeId, beforeCreatedAt: query.beforeCreatedAt }
    : undefined;
const membershipQuery = z.object({
  fileIds: z
    .string()
    .max(3699)
    .transform(value => value.split(','))
    .pipe(z.array(z.uuid()).min(1).max(100)),
  albumId: z.uuid().optional(),
});

export function createUserAlbumsRoute(service = userAlbumService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Vary', 'Cookie');
      if (error instanceof UserFileError) return c.json({ message: error.message }, error.status);
      if (error instanceof HTTPException && error.status < 500)
        return c.json({ message: 'Invalid album request.' }, error.status);
      c.error = error;
      return c.json({ message: 'Could not process this album. Please try again.' }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Vary', 'Cookie');
      if (!['GET', 'HEAD'].includes(c.req.method)) {
        if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
      }
      await next();
    })
    .use(
      '*',
      bodyLimit({
        maxSize: 32_768,
        onError: c => c.json({ message: 'Album request is too large.' }, 413),
      }),
    )
    .get('/tournaments', zValidator('query', albumTournamentSearchQuery), async c => {
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      const { q, page } = c.req.valid('query');
      return c.json({ data: await service.tournamentOptions(q, page) });
    })
    .get(
      '/by-tournament/:tournamentId',
      zValidator('param', z.object({ tournamentId: z.uuid() })),
      zValidator('query', userAlbumListQuery),
      async c =>
        c.json({
          data: await service.byTournament(
            c.req.valid('param').tournamentId,
            listCursor(c.req.valid('query')),
          ),
        }),
    )
    .get('/membership', zValidator('query', membershipQuery), async c => {
      const user = c.get('user');
      if (!user) return c.json({ message: 'Unauthorized' }, 401);
      const { fileIds, albumId } = c.req.valid('query');
      return c.json({ data: await service.membership(user.id, fileIds, albumId) });
    })
    .get(
      '/by-user/:userId',
      zValidator('param', z.object({ userId: z.string().min(1).max(255) })),
      zValidator('query', userAlbumListQuery),
      async c =>
        c.json({
          data: await service.list(
            c.req.valid('param').userId,
            listCursor(c.req.valid('query')),
            true,
          ),
        }),
    )
    .get('/', zValidator('query', userAlbumListQuery), async c => {
      const user = c.get('user');
      if (!user) return c.json({ message: 'Unauthorized' }, 401);
      return c.json({ data: await service.list(user.id, listCursor(c.req.valid('query'))) });
    })
    .get('/:id', zValidator('param', idParams), zValidator('query', userAlbumQuery), async c => {
      const { page, revision } = c.req.valid('query');
      const data = await service.read(c.req.valid('param').id, c.get('user')?.id, page, revision);
      if (data.album.visibility !== 'public') c.header('X-Robots-Tag', 'noindex, nofollow');
      return c.json({ data });
    })
    .post('/', zValidator('json', createUserAlbumInput), async c =>
      c.json({ data: await service.create(c.get('user')!.id, c.req.valid('json')) }, 201),
    )
    .patch(
      '/:id',
      zValidator('param', idParams),
      zValidator('json', updateUserAlbumInput),
      async c =>
        c.json({
          data: await service.update(
            c.get('user')!.id,
            c.req.valid('param').id,
            c.req.valid('json'),
          ),
        }),
    )
    .delete(
      '/:id',
      zValidator('param', idParams),
      zValidator('json', albumRevisionInput),
      async c =>
        c.json({
          data: await service.remove(
            c.get('user')!.id,
            c.req.valid('param').id,
            c.req.valid('json').revision,
          ),
        }),
    )
    .post(
      '/:id/images',
      zValidator('param', idParams),
      zValidator('json', addAlbumImagesInput),
      async c =>
        c.json({
          data: await service.addImages(
            c.get('user')!.id,
            c.req.valid('param').id,
            c.req.valid('json'),
          ),
        }),
    )
    .patch(
      '/:id/images/:fileId',
      zValidator('param', imageParams),
      zValidator('json', updateAlbumImageInput),
      async c =>
        c.json({
          data: await service.updateImage(
            c.get('user')!.id,
            c.req.valid('param').id,
            c.req.valid('param').fileId,
            c.req.valid('json'),
          ),
        }),
    )
    .delete(
      '/:id/images/:fileId',
      zValidator('param', imageParams),
      zValidator('json', albumRevisionInput),
      async c =>
        c.json({
          data: await service.removeImage(
            c.get('user')!.id,
            c.req.valid('param').id,
            c.req.valid('param').fileId,
            c.req.valid('json').revision,
          ),
        }),
    );
}
export const userAlbumsRoute = createUserAlbumsRoute();
