import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { userProfileFavoritesInputSchema } from '../../../types/UserProfile.ts';
import {
  getUserProfileFavorites,
  updateUserProfileFavorites,
  UserProfileError,
} from '../../lib/user-profile/service.ts';

const params = z.object({ id: z.string().min(1).max(200) });

export function createUserProfileRoute(
  getProfile = getUserProfileFavorites,
  updateProfile = updateUserProfileFavorites,
) {
  return new Hono<AuthExtension>()
    .use('/:id/profile', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      await next();
    })
    .get('/:id/profile', zValidator('param', params), async c => {
      try {
        return c.json({ data: await getProfile(c.req.valid('param').id) });
      } catch (error) {
        if (error instanceof UserProfileError)
          return c.json({ message: error.message }, error.status);
        throw error;
      }
    })
    .patch(
      '/:id/profile',
      async (c, next) => {
        const viewer = c.get('user');
        if (!viewer) return c.json({ message: 'Unauthorized' }, 401);
        if (viewer.id !== c.req.param('id')) return c.json({ message: 'Forbidden' }, 403);
        if (c.req.header('X-Requested-With') !== 'swubase') {
          return c.json({ message: 'Invalid request origin.' }, 403);
        }
        await next();
      },
      zValidator('param', params),
      bodyLimit({ maxSize: 2048, onError: c => c.json({ message: 'Request too large.' }, 413) }),
      zValidator('json', userProfileFavoritesInputSchema),
      async c => {
        try {
          return c.json({ data: await updateProfile(c.get('user')!.id, c.req.valid('json')) });
        } catch (error) {
          if (error instanceof UserProfileError)
            return c.json({ message: error.message }, error.status);
          throw error;
        }
      },
    );
}

export const userProfileRoute = createUserProfileRoute();
