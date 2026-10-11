import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { commentContentSchema, MAX_COMMENT_BYTES } from '../../../shared/types/discussions.ts';
import { postValidationMessage } from '../../../shared/posts/content.ts';
import { createCardComment, getCardDiscussion } from '../../lib/cards/discussion.ts';

const params = z.object({ id: z.string().min(1).max(200) });
const privateResponse = createMiddleware<AuthExtension>(async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});

export const cardDiscussionRoute = new Hono<AuthExtension>()
  .get('/:id/discussion', privateResponse, zValidator('param', params), async c => {
    const result = await getCardDiscussion(c.req.valid('param').id);
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .post(
    '/:id/discussion/comments',
    privateResponse,
    zValidator('param', params),
    async (c, next) => {
      if (!c.get('user')) return c.json({ error: 'Sign in to comment.' }, 401);
      await next();
    },
    bodyLimit({
      maxSize: MAX_COMMENT_BYTES + 4096,
      onError: c => c.json({ error: 'This comment is too large.' }, 413),
    }),
    zValidator('json', z.object({ content: commentContentSchema }).strict(), (result, c) => {
      if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
    }),
    async c => {
      const result = await createCardComment(
        c.req.valid('param').id,
        c.get('user')!.id,
        c.req.valid('json').content,
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data }, 201);
    },
  );
