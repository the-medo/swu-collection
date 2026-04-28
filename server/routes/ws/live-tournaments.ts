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

export const wsLiveTournamentsRoute = new Hono<AuthExtension>().get('/:weekendId', async c => {
  const origin = c.req.header('origin');
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
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

  return upgradeWebSocket(c, {
    onOpen(_event, ws) {
      registerLiveTournamentSocket(ws, {
        userId: user.id,
        weekendId,
      });

      ws.send(
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
      unregisterLiveTournamentSocket(ws);
    },
    onError(_event, ws) {
      unregisterLiveTournamentSocket(ws);
    },
  });
});
