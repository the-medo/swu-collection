import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { calendarSubscriptionService } from '../lib/calendar-subscription/service.ts';
import { CalendarConfigurationError } from '../lib/calendar-subscription/token.ts';

export function createUserCalendarSubscriptionRoute(service = calendarSubscriptionService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof CalendarConfigurationError)
        return c.json({ message: error.message }, 503);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Vary', 'Cookie');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      if (!['GET', 'HEAD'].includes(c.req.method) && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .get('/', async c => c.json({ data: await service.get(c.get('user')!.id) }))
    .put('/', async c => c.json({ data: await service.enable(c.get('user')!.id) }))
    .post('/regenerate', async c => c.json({ data: await service.enable(c.get('user')!.id, true) }))
    .delete('/', async c => c.json({ data: await service.disable(c.get('user')!.id) }));
}
export const userCalendarSubscriptionRoute = createUserCalendarSubscriptionRoute();
