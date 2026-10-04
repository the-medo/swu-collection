import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { postsService, type PostsService } from '../lib/posts/service.ts';
import {
  MAX_POST_BYTES,
  saveProfilePostSchema,
  postValidationMessage,
} from '../../shared/posts/content.ts';

const params = z.object({ userId: z.string().min(1).max(255) });
// Profiles are public. Future post types need their own publication/access policy.
export function createPostsRoute(service: PostsService = postsService) {
  return new Hono<AuthExtension>()
    .get('/profile/:userId', zValidator('param', params), async c => {
      const { userId } = c.req.valid('param');
      const result = await service.getProfile(userId);
      if (!result.userExists) return c.json({ error: 'User not found.' }, 404);
      return c.json({ data: result.post });
    })
    .put(
      '/profile/:userId',
      zValidator('param', params),
      async (c, next) => {
        const viewer = c.get('user');
        if (!viewer) return c.json({ error: 'Sign in to edit your bio.' }, 401);
        if (viewer.id !== c.req.param('userId'))
          return c.json({ error: 'You can only edit your own bio.' }, 403);
        await next();
      },
      bodyLimit({
        maxSize: MAX_POST_BYTES + 4096,
        onError: c => c.json({ error: 'This post is too large.' }, 413),
      }),
      zValidator('json', saveProfilePostSchema, (result, c) => {
        if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
      }),
      async c => {
        const { content, revision } = c.req.valid('json');
        const data = await service.saveProfile(c.get('user')!.id, content, revision);
        if (!data)
          return c.json(
            {
              error:
                'Your bio changed in another tab. Your draft is still here. Choose which version to keep.',
            },
            409,
          );
        return c.json({ data });
      },
    );
}

export const postsRoute = createPostsRoute();
