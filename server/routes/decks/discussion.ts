import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { MAX_POST_BYTES, postValidationMessage } from '../../../shared/posts/content.ts';
import { saveDeckArticleSchema } from '../../../shared/types/deck-discussion.ts';
import { getDeckArticle, saveDeckArticle } from '../../lib/decks/article.ts';
import { getAttachedDiscussion } from '../../lib/discussions/service.ts';

const deckParams = z.object({ id: z.guid() });
const privateResponse = createMiddleware<AuthExtension>(async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});
const signedIn = createMiddleware<AuthExtension>(async (c, next) => {
  if (!c.get('user')) return c.json({ error: 'Sign in to write a guide.' }, 401);
  await next();
});
const articleBody = bodyLimit({
  maxSize: MAX_POST_BYTES + 4096,
  onError: c => c.json({ error: 'This guide is too large.' }, 413),
});
export const deckDiscussionRoute = new Hono<AuthExtension>()
  .get('/:id/discussion', privateResponse, zValidator('param', deckParams), async c => {
    const result = await getAttachedDiscussion('deck', c.req.valid('param').id, c.get('user')?.id);
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
  );
