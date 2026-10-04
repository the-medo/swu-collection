import { createSessionCheckedSocket } from '../../lib/ws/sessionCheckedSocket.ts';
import { startGameResultNotifications } from '../../lib/ws/gameResultsNotifications.ts';
import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import type { AuthExtension } from '../../auth/auth.ts';
import {
  getUserTeamIdsForRealtime,
  registerGameResultSocket,
  unregisterGameResultSocket,
} from '../../lib/ws/gameResultsRealtime.ts';

const allowedOrigins = new Set([process.env.BETTER_AUTH_URL].filter(Boolean));
const unauthorizedCloseCode = 4401;
const forbiddenCloseCode = 4403;

const closeWebSocket = (c: Parameters<typeof upgradeWebSocket>[0], code: number, reason: string) =>
  upgradeWebSocket(c, {
    onOpen(_event, ws) {
      ws.close(code, reason);
    },
  });

export const wsGameResultsRoute = new Hono<AuthExtension>().get('/', async c => {
  const origin = c.req.header('origin');
  const isWebSocketRequest = c.req.header('upgrade')?.toLowerCase() === 'websocket';

  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    if (isWebSocketRequest) {
      return closeWebSocket(c, forbiddenCloseCode, 'Forbidden');
    }

    return c.json({ error: 'Forbidden' }, 403);
  }

  const user = c.get('user');
  const session = c.get('session');
  if (!user || !session) {
    if (isWebSocketRequest) {
      return closeWebSocket(c, unauthorizedCloseCode, 'Unauthorized');
    }

    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamIds = await getUserTeamIdsForRealtime(user.id);
  await startGameResultNotifications();

  let guarded: ReturnType<typeof createSessionCheckedSocket> | undefined;
  return upgradeWebSocket(c, {
    onOpen(_event, ws) {
      guarded = createSessionCheckedSocket(ws, { userId: user.id, sessionId: session.id }, () =>
        unregisterGameResultSocket(ws),
      );
      registerGameResultSocket(guarded.socket, {
        userId: user.id,
        teamIds,
      });

      guarded?.socket.send(
        JSON.stringify({
          type: 'game_results.connected',
          data: {
            userId: user.id,
            teamIds,
            at: new Date().toISOString(),
          },
        }),
      );
    },
    onMessage(event) {
      const input = typeof event.data === 'string' ? event.data.trim() : '';

      if (input === 'ping') {
        guarded?.socket.send(
          JSON.stringify({
            type: 'pong',
            at: new Date().toISOString(),
          }),
        );
        return;
      }

      guarded?.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Unsupported websocket command',
        }),
      );
    },
    onClose() {
      guarded?.dispose();
    },
    onError() {
      guarded?.socket.close(1011, 'Socket error');
    },
  });
});
