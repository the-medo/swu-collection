import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { calendarPrivacyInput } from '../../types/TournamentCalendar.ts';
import { calendarSharingService } from '../lib/tournaments/calendarSharing.ts';

export const userCalendarRoute = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    await next();
  })
  .use('/privacy', async (c, next) => {
    if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
    await next();
  })
  .get('/privacy', async c => {
    const privacy = await calendarSharingService.privacy(c.get('user')!.id);
    return privacy ? c.json({ data: { privacy } }) : c.json({ message: 'User not found.' }, 404);
  })
  .patch('/privacy', zValidator('json', calendarPrivacyInput), async c => {
    const data = await calendarSharingService.setPrivacy(
      c.get('user')!.id,
      c.req.valid('json').privacy,
    );
    return data ? c.json({ data }) : c.json({ message: 'User not found.' }, 404);
  })
  .get(
    '/:userId',
    zValidator('param', z.object({ userId: z.string().min(1).max(255) })),
    async c => {
      const data = await calendarSharingService.shared(
        c.req.valid('param').userId,
        c.get('user')?.id,
      );
      return data
        ? c.json({ data })
        : c.json({ message: 'Calendar not found or not shared with you.' }, 404);
    },
  );
