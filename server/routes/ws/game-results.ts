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
  if (!user) {
    if (isWebSocketRequest) {
      return closeWebSocket(c, unauthorizedCloseCode, 'Unauthorized');
    }

    return c.json({ error: 'Unauthorized' }, 401);
  }

  const teamIds = await getUserTeamIdsForRealtime(user.id);

  return upgradeWebSocket(c, {
    onOpen(_event, ws) {
      registerGameResultSocket(ws, {
        userId: user.id,
        teamIds,
      });

      ws.send(
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
    onMessage(event, ws) {
      const input = typeof event.data === 'string' ? event.data.trim() : '';

      if (input === 'ping') {
        ws.send(
          JSON.stringify({
            type: 'pong',
            at: new Date().toISOString(),
          }),
        );
        return;
      }

      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Unsupported websocket command',
        }),
      );
    },
    onClose(_event, ws) {
      unregisterGameResultSocket(ws);
    },
    onError(_event, ws) {
      unregisterGameResultSocket(ws);
    },
  });
});
