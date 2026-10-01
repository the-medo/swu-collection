import { createHmac, timingSafeEqual } from 'node:crypto';

export class CalendarConfigurationError extends Error {}

function signingKey(secret = process.env.BETTER_AUTH_SECRET) {
  if (!secret || secret.length < 32)
    throw new CalendarConfigurationError('Calendar subscriptions are not configured.');
  return secret;
}

export function calendarToken(id: string, secret?: string) {
  const signature = createHmac('sha256', signingKey(secret))
    .update(`swubase:calendar-subscription:v1:${id}`)
    .digest('base64url');
  return `${id}.${signature}`;
}

export function calendarTokenId(token: string, secret?: string): string | null {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.[A-Za-z0-9_-]{43}$/.test(
      token,
    )
  )
    return null;
  const id = token.slice(0, 36);
  return timingSafeEqual(Buffer.from(token), Buffer.from(calendarToken(id, secret))) ? id : null;
}

export function calendarOrigin(value = process.env.BETTER_AUTH_URL) {
  try {
    const url = new URL(value ?? '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      throw new Error();
    return url.origin;
  } catch {
    throw new CalendarConfigurationError('Calendar subscriptions are not configured.');
  }
}

export function isCalendarFeedRequest(url: string | undefined) {
  if (!url) return false;
  try {
    return new URL(url, 'http://localhost').pathname.startsWith('/api/calendar/');
  } catch {
    return false;
  }
}
