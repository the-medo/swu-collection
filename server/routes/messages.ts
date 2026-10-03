import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import {
  conversationCursorSchema,
  messagePeerSchema,
  messageUpdatesQuerySchema,
  readMessagesSchema,
  sendMessageSchema,
} from '../../shared/types/messages.ts';
import { messages } from '../lib/messages/service.ts';

const cursorQuery = z.object({ cursor: z.string().max(300).optional() }).transform((value, ctx) => {
  if (!value.cursor) return {};
  try {
    return { cursor: conversationCursorSchema.parse(JSON.parse(value.cursor)) };
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid conversation cursor' });
    return z.NEVER;
  }
});
export const messagesRoute = new Hono<AuthExtension>()
  .onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    throw error;
  })
  .use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  })
  .get('/summary', async c => c.json(await messages.summary(c.get('user')!.id)))
  .get('/conversations', zValidator('query', cursorQuery), async c =>
    c.json(await messages.conversations(c.get('user')!.id, c.req.valid('query').cursor)),
  )
  .get(
    '/with/:userId/updates',
    zValidator('param', messagePeerSchema),
    zValidator('query', messageUpdatesQuerySchema),
    async c =>
      c.json(
        await messages.updates(
          c.get('user')!.id,
          c.req.valid('param').userId,
          c.req.valid('query').after,
        ),
      ),
  )
  .get(
    '/with/:userId',
    zValidator('param', messagePeerSchema),
    zValidator(
      'query',
      z.object({ before: z.coerce.number().int().positive().max(2147483647).optional() }),
    ),
    async c =>
      c.json(
        await messages.history(
          c.get('user')!.id,
          c.req.valid('param').userId,
          c.req.valid('query').before,
        ),
      ),
  )
  .post(
    '/with/:userId',
    bodyLimit({ maxSize: 40_000 }),
    zValidator('param', messagePeerSchema),
    zValidator('json', sendMessageSchema),
    async c =>
      c.json(
        await messages.send(c.get('user')!.id, c.req.valid('param').userId, c.req.valid('json')),
        201,
      ),
  )
  .post(
    '/conversations/:id/read',
    bodyLimit({ maxSize: 1024 }),
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', readMessagesSchema),
    async c =>
      c.json(
        await messages.read(
          c.get('user')!.id,
          c.req.valid('param').id,
          c.req.valid('json').throughSequence,
        ),
      ),
  );
