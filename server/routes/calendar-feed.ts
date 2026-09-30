import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { calendarSubscriptionService } from '../lib/calendar-subscription/service.ts';

export function createCalendarFeedRoute(service = calendarSubscriptionService) {
  return new Hono()
    .onError((_error, c) => {
      // Do not send bearer URLs or saved-event data to logs/error reporting.
      c.error = new Error('Calendar feed unavailable.');
      return c.text('Calendar feed unavailable. Please try again later.', 503);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
      c.header('Referrer-Policy', 'no-referrer');
      c.header('X-Content-Type-Options', 'nosniff');
      await next();
    })
    .get('/:file', async c => {
      const file = c.req.param('file');
      if (!file.endsWith('.ics')) return c.text('Calendar not found.', 404);
      const body = await service.feed(file.slice(0, -4));
      if (body === null) return c.text('Calendar not found.', 404);
      const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
      c.header('ETag', etag);
      c.header('Content-Type', 'text/calendar; charset=utf-8');
      c.header('Content-Disposition', 'inline; filename="swubase-tournaments.ics"');
      // Authorize first: a revoked URL must never receive 304 for an old private calendar.
      if (
        c.req
          .header('If-None-Match')
          ?.split(',')
          .some(tag => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag)
      )
        return c.body(null, 304);
      return c.body(body);
    })
    .all('*', c => c.text('Calendar not found.', 404));
}
export const calendarFeedRoute = createCalendarFeedRoute();
