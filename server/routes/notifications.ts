import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { hasCrossfireAccess } from '../../shared/lib/auth/roles.ts';
import {
  notificationActionSchema,
  notificationCursorSchema,
} from '../../shared/types/notifications.ts';
import { notifications } from '../lib/notifications/service.ts';

const cursorQuery = z.object({ cursor: z.string().max(300).optional() }).transform((value, ctx) => {
  if (!value.cursor) return {};
  try {
    return { cursor: notificationCursorSchema.parse(JSON.parse(value.cursor)) };
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid notification cursor' });
    return z.NEVER;
  }
});
export const notificationsRoute = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  })
  .get('/summary', async c =>
    c.json({
      unreadCount: await notifications.unreadCount(
        c.get('user')!.id,
        process.env.CROSSFIRE_ENABLED === '1' && hasCrossfireAccess(c.get('user')!.role),
      ),
    }),
  )
  .get('/', zValidator('query', cursorQuery), async c =>
    c.json(
      await notifications.list(
        c.get('user')!.id,
        process.env.CROSSFIRE_ENABLED === '1' && hasCrossfireAccess(c.get('user')!.role),
        c.req.valid('query').cursor,
      ),
    ),
  )
  .get('/unread', async c => {
    const { items } = await notifications.list(
      c.get('user')!.id,
      process.env.CROSSFIRE_ENABLED === '1' && hasCrossfireAccess(c.get('user')!.role),
      undefined,
      { unreadOnly: true, limit: 5 },
    );
    return c.json({ items });
  })
  .post('/read-all', async c => {
    await notifications.readAll(
      c.get('user')!.id,
      process.env.CROSSFIRE_ENABLED === '1' && hasCrossfireAccess(c.get('user')!.role),
    );
    return c.json({ success: true });
  })
  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', notificationActionSchema),
    async c => {
      const updated = await notifications.update(
        c.get('user')!.id,
        c.req.valid('param').id,
        c.req.valid('json').action,
      );
      if (!updated) return c.json({ error: 'Notification not found' }, 404);
      return c.json({ success: true });
    },
  );
