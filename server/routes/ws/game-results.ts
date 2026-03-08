import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import type { AuthExtension } from '../../auth/auth.ts';
import {
  getUserTeamIdsForRealtime,
  registerGameResultSocket,
  unregisterGameResultSocket,
} from '../../lib/ws/gameResultsRealtime.ts';

const allowedOrigins = new Set([process.env.BETTER_AUTH_URL].filter(Boolean));

export const wsGameResultsRoute = new Hono<AuthExtension>().get('/', async c => {
  const origin = c.req.header('origin');
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const user = c.get('user');
  if (!user) {
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
