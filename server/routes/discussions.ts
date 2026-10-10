import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import {
  commentsQuerySchema,
  createCommentSchema,
  updateCommentSchema,
  MAX_COMMENT_BYTES,
} from '../../shared/types/discussions.ts';
import { postValidationMessage } from '../../shared/posts/content.ts';
import * as service from '../lib/discussions/service.ts';
import { discussionPolicy } from '../lib/discussions/access.ts';
const params = z.object({ id: z.guid() });
const commentParams = params.extend({ commentId: z.guid() });
const privateResponse = createMiddleware<AuthExtension>(async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});
const signedIn = createMiddleware<AuthExtension>(async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'Sign in to comment.' }, 401);
  await next();
});
const size = bodyLimit({
  maxSize: MAX_COMMENT_BYTES + 4096,
  onError: c => c.json({ error: 'This comment is too large.' }, 413),
});
export const discussionsRoute = new Hono<AuthExtension>()
  .use('*', privateResponse)
  .get('/:id', zValidator('param', params), async c => {
    const result = await service.getDiscussionInfo(
      c.req.valid('param').id,
      discussionPolicy(c.get('user')?.id),
    );
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .get(
    '/:id/comments',
    zValidator('param', params),
    zValidator('query', commentsQuerySchema),
    async c => {
      const { cursor, limit, parentId } = c.req.valid('query');
      const result = await service.getComments(
        c.req.valid('param').id,
        discussionPolicy(c.get('user')?.id),
        cursor,
        limit,
        parentId,
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json(result.data);
    },
  )
  .post(
    '/:id/comments',
    zValidator('param', params),
    signedIn,
    size,
    zValidator('json', createCommentSchema, (result, c) => {
      if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
    }),
    async c => {
      const { content, parentId } = c.req.valid('json');
      const result = await service.createComment(
        c.req.valid('param').id,
        c.get('user')!.id,
        content,
        discussionPolicy(c.get('user')!.id),
        parentId,
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data }, 201);
    },
  )
  .get('/:id/comments/:commentId', zValidator('param', commentParams), async c => {
    const { id, commentId } = c.req.valid('param');
    const result = await service.getComment(id, commentId, discussionPolicy(c.get('user')?.id));
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .get('/:id/comments/:commentId/thread', zValidator('param', commentParams), async c => {
    const { id, commentId } = c.req.valid('param');
    const result = await service.getCommentThread(
      id,
      commentId,
      discussionPolicy(c.get('user')?.id),
    );
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .put(
    '/:id/comments/:commentId',
    zValidator('param', commentParams),
    signedIn,
    size,
    zValidator('json', updateCommentSchema, (result, c) => {
      if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
    }),
    async c => {
      const { id, commentId } = c.req.valid('param');
      const { content, revision } = c.req.valid('json');
      const result = await service.updateComment(
        id,
        commentId,
        c.get('user')!.id,
        content,
        revision,
        discussionPolicy(c.get('user')!.id),
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data });
    },
  )
  .delete('/:id/comments/:commentId', zValidator('param', commentParams), signedIn, async c => {
    const { id, commentId } = c.req.valid('param');
    const result = await service.deleteComment(
      id,
      commentId,
      c.get('user')!.id,
      discussionPolicy(c.get('user')!.id),
    );
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  });
