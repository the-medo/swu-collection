import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { websocket } from 'hono/bun';
import postgres from 'postgres';
import type { AuthExtension } from '../../auth/auth.ts';
import { wsGameResultsRoute } from '../../routes/ws/game-results.ts';
import { wsLiveTournamentsRoute } from '../../routes/ws/live-tournaments.ts';
import { invalidateGameResultSockets, hasActiveGameResultSockets } from './gameResultsRealtime.ts';
import { hasActiveLiveTournamentSockets } from './liveTournamentRealtime.ts';
async function until(check: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > deadline) throw Error('Timed out waiting for socket');
    await Bun.sleep(5);
  }
}
test.skipIf(process.env.SWUBASE_USER_REPORTS_DB_TEST !== '1')(
  'already-open legacy sockets reject frames after a ban and clean up registrations',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw Error('Select an isolated worktree database.');
    const sql = postgres(url.toString());
    const userId = `legacy-restriction-${crypto.randomUUID()}`,
      sessionId = crypto.randomUUID(),
      weekendId = crypto.randomUUID();
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        if (c.req.header('Test-User')) {
          c.set('user', { id: userId } as NonNullable<AuthExtension['Variables']['user']>);
          c.set('session', { id: sessionId } as NonNullable<AuthExtension['Variables']['session']>);
        }
        await next();
      })
      .route('/games', wsGameResultsRoute)
      .route('/live', wsLiveTournamentsRoute);
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app.fetch, websocket });
    const sockets: WebSocket[] = [];
    function connect(path: string, authenticated = true) {
      const messages: string[] = [];
      let code = 0;
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}${path}`, {
        headers: {
          Origin: process.env.BETTER_AUTH_URL!,
          ...(authenticated ? { 'Test-User': userId } : {}),
        },
      });
      socket.onmessage = event => messages.push(String(event.data));
      socket.onclose = event => {
        code = event.code;
      };
      sockets.push(socket);
      return { socket, messages, code: () => code };
    }
    try {
      await sql`INSERT INTO "user" (id,name,display_name,email,email_verified,currency,created_at,updated_at) VALUES (${userId},${userId},${userId},${userId + '@invalid.local'},false,'USD',now(),now())`;
      await sql`INSERT INTO session (id,user_id,token,expires_at,created_at,updated_at) VALUES (${sessionId},${userId},${crypto.randomUUID()},now()+interval '1 hour',now(),now())`;
      await sql`INSERT INTO tournament_weekend (id,name,date) VALUES (${weekendId},'Moderation socket fixture','2026-10-04')`;
      const anonymous = connect('/live/' + weekendId, false);
      await until(() => !!anonymous.code());
      expect(anonymous.code()).toBe(4401);
      const games = connect('/games'),
        live = connect('/live/' + weekendId);
      await until(() => games.messages.length > 0 && live.messages.length > 0);
      expect(JSON.parse(games.messages[0]!).type).toBe('game_results.connected');
      expect(JSON.parse(live.messages[0]!).type).toBe('live_weekend.connected');
      games.socket.send('ping');
      live.socket.send('ping');
      await until(() => games.messages.length === 2 && live.messages.length === 2);
      await sql`UPDATE "user" SET banned=true WHERE id=${userId}`;
      // Retain the session deliberately: restriction rechecks must also cover a late-created session.
      invalidateGameResultSockets({ userId });
      live.socket.send('ping');
      await until(() => !!games.code() && !!live.code());
      expect(games.code()).toBe(4401);
      expect(live.code()).toBe(4401);
      expect(games.messages).toHaveLength(2);
      expect(live.messages).toHaveLength(2);
      expect(hasActiveGameResultSockets()).toBe(false);
      expect(hasActiveLiveTournamentSockets()).toBe(false);
    } finally {
      for (const socket of sockets) socket.close();
      server.stop(true);
      await sql`DELETE FROM tournament_weekend WHERE id=${weekendId}`;
      await sql`DELETE FROM "user" WHERE id=${userId}`;
      await sql.end();
    }
  },
);
