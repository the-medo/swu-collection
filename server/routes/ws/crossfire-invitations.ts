import { hasCrossfireAccess } from '../../../shared/lib/auth/roles.ts';
import { AdmissionError } from '../../lib/crossfire/lobbies.ts';
import { Hono, type Context } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import type { AuthExtension } from '../../auth/auth.ts';
import { getCrossfireServices } from '../crossfire.ts';

function reject(c: Context<AuthExtension>, status: 401 | 403 | 503, reason: string) {
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket')
    return c.json({ error: reason }, status);
  return upgradeWebSocket(c, {
    onOpen(_event, ws) {
      ws.close(status === 401 ? 4401 : status === 403 ? 4403 : 4404, reason);
    },
  });
}

export const wsCrossfireInvitations = new Hono<AuthExtension>().get('/', async c => {
  if (process.env.CROSSFIRE_ENABLED !== '1') return reject(c, 503, 'Unavailable');
  if (!process.env.BETTER_AUTH_URL || c.req.header('origin') !== process.env.BETTER_AUTH_URL)
    return reject(c, 403, 'Forbidden');
  const user = c.get('user'),
    session = c.get('session');
  if (!user || !session) return reject(c, 401, 'Unauthorized');
  if (!hasCrossfireAccess(user.role)) return reject(c, 403, 'Forbidden');
  const realtime = getCrossfireServices().invitations;
  const principal = { userId: user.id, sessionId: session.id };
  try {
    await realtime.authorize(principal);
  } catch (error) {
    if (error instanceof AdmissionError && error.code === 'forbidden')
      return reject(c, 403, 'Forbidden');
    return reject(c, 401, 'Unauthorized');
  }
  await realtime.start();
  return upgradeWebSocket(c, {
    onOpen: (_event, ws) => realtime.register(ws, principal),
    onMessage: (event, ws) => {
      if (event.data === 'ping') void realtime.ping(ws);
      else ws.close(4400, 'Unsupported message');
    },
    onClose: (_event, ws) => realtime.remove(ws),
    onError: (_event, ws) => realtime.remove(ws),
  });
});
