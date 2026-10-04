import { createSessionCheckedSocket } from '../../lib/ws/sessionCheckedSocket.ts';
import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { tournamentWeekend } from '../../db/schema/tournament_weekend.ts';
import { getLiveTournamentHomeVersion } from '../../lib/live-tournaments/liveTournamentHomeCache.ts';
import {
  registerLiveTournamentSocket,
  unregisterLiveTournamentSocket,
} from '../../lib/ws/liveTournamentRealtime.ts';

const allowedOrigins = new Set([process.env.BETTER_AUTH_URL].filter(Boolean));
const reject = (c: Parameters<typeof upgradeWebSocket>[0], status: 401 | 403, message: string) =>
  c.req.header('upgrade')?.toLowerCase() === 'websocket'
    ? upgradeWebSocket(c, {
        onOpen: (_event, ws) => ws.close(status === 401 ? 4401 : 4403, message),
      })
    : c.json({ error: message }, status);

export const wsLiveTournamentsRoute = new Hono<AuthExtension>().get('/:weekendId', async c => {
  const origin = c.req.header('origin');
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return reject(c, 403, 'Forbidden');
  }

  const user = c.get('user');
  const session = c.get('session');
  if (!user || !session) {
    return reject(c, 401, 'Unauthorized');
  }

  const weekendId = z.guid().parse(c.req.param('weekendId'));
  const weekend = (
    await db
      .select({ id: tournamentWeekend.id })
      .from(tournamentWeekend)
      .where(eq(tournamentWeekend.id, weekendId))
      .limit(1)
  )[0];

  if (!weekend) {
    return c.json({ error: 'Tournament weekend not found' }, 404);
  }

  let guarded: ReturnType<typeof createSessionCheckedSocket> | undefined;
  return upgradeWebSocket(c, {
    onOpen(_event, ws) {
      guarded = createSessionCheckedSocket(ws, { userId: user.id, sessionId: session.id }, () =>
        unregisterLiveTournamentSocket(ws),
      );
      registerLiveTournamentSocket(guarded.socket, {
        userId: user.id,
        weekendId,
      });

      guarded?.socket.send(
        JSON.stringify({
          type: 'live_weekend.connected',
          data: {
            weekendId,
            userId: user.id,
            version: getLiveTournamentHomeVersion(weekendId),
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
