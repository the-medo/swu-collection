import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { MAX_POST_BYTES, postValidationMessage } from '../../../shared/posts/content.ts';
import {
  createDeckCommentSchema,
  deckCommentsQuerySchema,
  MAX_DECK_COMMENT_BYTES,
  saveDeckArticleSchema,
  updateDeckCommentSchema,
} from '../../../shared/types/deck-discussion.ts';
import {
  createDeckComment,
  deleteDeckComment,
  getDeckArticle,
  getDeckDiscussion,
  getDeckComment,
  getDeckComments,
  getOwnDeckComments,
  saveDeckArticle,
  updateDeckComment,
} from '../../lib/decks/discussion.ts';

const deckParams = z.object({ id: z.guid() });
const commentParams = deckParams.extend({ commentId: z.guid() });
const privateResponse = createMiddleware<AuthExtension>(async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});
const signedIn = createMiddleware<AuthExtension>(async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'Sign in to write a guide or comment.' }, 401);
  await next();
});
const articleBody = bodyLimit({
  maxSize: MAX_POST_BYTES + 4096,
  onError: c => c.json({ error: 'This guide is too large.' }, 413),
});
const commentBody = bodyLimit({
  maxSize: MAX_DECK_COMMENT_BYTES + 4096,
  onError: c => c.json({ error: 'This comment is too large.' }, 413),
});

export const deckDiscussionRoute = new Hono<AuthExtension>()
  .get('/:id/discussion', privateResponse, zValidator('param', deckParams), async c => {
    const result = await getDeckDiscussion(c.req.valid('param').id, c.get('user')?.id);
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .get('/:id/article', privateResponse, zValidator('param', deckParams), async c => {
    const result = await getDeckArticle(c.req.valid('param').id, c.get('user')?.id);
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .put(
    '/:id/article',
    privateResponse,
    zValidator('param', deckParams),
    signedIn,
    articleBody,
    zValidator('json', saveDeckArticleSchema, (result, c) => {
      if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
    }),
    async c => {
      const { content, revision } = c.req.valid('json');
      const result = await saveDeckArticle(
        c.req.valid('param').id,
        c.get('user')!.id,
        content,
        revision,
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data });
    },
  )
  .get(
    '/:id/comments',
    privateResponse,
    zValidator('param', deckParams),
    zValidator('query', deckCommentsQuerySchema),
    async c => {
      const { cursor, limit, parentId } = c.req.valid('query');
      const result = await getDeckComments(
        c.req.valid('param').id,
        c.get('user')?.id,
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
    privateResponse,
    zValidator('param', deckParams),
    signedIn,
    commentBody,
    zValidator('json', createDeckCommentSchema, (result, c) => {
      if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
    }),
    async c => {
      const result = await createDeckComment(
        c.req.valid('param').id,
        c.get('user')!.id,
        c.req.valid('json').content,
        c.req.valid('json').parentId,
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data }, 201);
    },
  )
  .get(
    '/:id/comments/own',
    privateResponse,
    zValidator('param', deckParams),
    signedIn,
    zValidator('query', deckCommentsQuerySchema),
    async c => {
      const { cursor, limit } = c.req.valid('query');
      const result = await getOwnDeckComments(
        c.req.valid('param').id,
        c.get('user')!.id,
        cursor,
        limit,
      );
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json(result.data);
    },
  )
  .get('/:id/comments/:commentId', privateResponse, zValidator('param', commentParams), async c => {
    const { id, commentId } = c.req.valid('param');
    const result = await getDeckComment(id, commentId, c.get('user')?.id);
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  })
  .put(
    '/:id/comments/:commentId',
    privateResponse,
    zValidator('param', commentParams),
    signedIn,
    commentBody,
    zValidator('json', updateDeckCommentSchema, (result, c) => {
      if (!result.success) return c.json({ error: postValidationMessage(result.error) }, 400);
    }),
    async c => {
      const { id, commentId } = c.req.valid('param');
      const { content, revision } = c.req.valid('json');
      const result = await updateDeckComment(id, commentId, c.get('user')!.id, content, revision);
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data });
    },
  )
  .delete(
    '/:id/comments/:commentId',
    privateResponse,
    zValidator('param', commentParams),
    signedIn,
    async c => {
      const { id, commentId } = c.req.valid('param');
      const result = await deleteDeckComment(id, commentId, c.get('user')!.id);
      if ('error' in result) return c.json({ error: result.error }, result.status);
      return c.json({ data: result.data });
    },
  );
