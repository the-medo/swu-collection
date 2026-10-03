import { Hono, type Context } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import type { AuthExtension } from '../../auth/auth.ts';
import { getAppRealtime, type AppRealtime } from '../../lib/ws/appRealtime.ts';

function reject(c: Context<AuthExtension>, status: 401 | 403, reason: string) {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket')
    return c.json({ error: reason }, status);
  return upgradeWebSocket(c, {
    onOpen: (_event, ws) => ws.close(status === 401 ? 4401 : 4403, reason),
  });
}
export function createAppEventsRoute(service: () => AppRealtime = getAppRealtime) {
  return new Hono<AuthExtension>().get('/', async c => {
    if (!process.env.BETTER_AUTH_URL || c.req.header('origin') !== process.env.BETTER_AUTH_URL)
      return reject(c, 403, 'Forbidden');
    const user = c.get('user'),
      session = c.get('session');
    if (!user || !session) return reject(c, 401, 'Unauthorized');
    const realtime = service(),
      principal = { userId: user.id, sessionId: session.id };
    if (!(await realtime.authorize(principal))) return reject(c, 401, 'Unauthorized');
    await realtime.start();
    return upgradeWebSocket(c, {
      onOpen: (_event, ws) => realtime.register(ws, principal),
      onMessage: (event, ws) => realtime.message(ws, event.data),
      onClose: (_event, ws) => realtime.remove(ws),
      onError: (_event, ws) => realtime.remove(ws),
    });
  });
}
export const wsAppEventsRoute = createAppEventsRoute();
