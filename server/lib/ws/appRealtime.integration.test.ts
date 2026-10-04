import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { websocket } from 'hono/bun';
import postgres from 'postgres';
import type { AuthExtension } from '../../auth/auth.ts';
import { messagesRoute } from '../../routes/messages.ts';
import { AppRealtime } from './appRealtime.ts';
import { createAppEventsRoute } from '../../routes/ws/events.ts';
import { invalidateGameResultSockets, hasActiveGameResultSockets } from './gameResultsRealtime.ts';
import { hasActiveLiveTournamentSockets } from './liveTournamentRealtime.ts';

async function until(check: () => boolean, timeout = 3000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error('Timed out waiting for socket event');
    await Bun.sleep(10);
  }
}
test.skipIf(process.env.NOTIFICATIONS_DB_TEST !== '1')(
  'shared sockets isolate recipients, reauthorize rooms/sessions, resync and clean up',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const sql = postgres(url.toString(), { max: 4 });
    const service = new AppRealtime(sql, true);
    const prefix = `events-${crypto.randomUUID()}`;
    const a = `${prefix}-a`,
      b = `${prefix}-b`,
      recipient = `${prefix}-recipient`,
      teamId = crypto.randomUUID();
    const origin = 'https://socket-test.invalid';
    const oldOrigin = process.env.BETTER_AUTH_URL;
    process.env.BETTER_AUTH_URL = origin;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        if (id) {
          c.set('user', { id } as NonNullable<AuthExtension['Variables']['user']>);
          c.set('session', { id: `${id}-session` } as NonNullable<
            AuthExtension['Variables']['session']
          >);
        }
        await next();
      })
      .route('/messages', messagesRoute)
      .route(
        '/api/ws/events',
        createAppEventsRoute(() => service),
      );
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app.fetch, websocket });
    const clients: WebSocket[] = [];
    function connect(userId?: string, clientOrigin = origin) {
      const events: Record<string, unknown>[] = [];
      let closeCode = 0;
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}/api/ws/events`, {
        headers: { origin: clientOrigin, ...(userId ? { 'test-user': userId } : {}) },
      });
      clients.push(socket);
      socket.onmessage = e => events.push(JSON.parse(String(e.data)));
      socket.onclose = e => {
        closeCode = e.code;
      };
      return {
        socket,
        events,
        close: () => closeCode,
        send: (message: object) => socket.send(JSON.stringify({ v: 1, ...message })),
      };
    }
    try {
      for (const id of [a, b, recipient]) {
        await sql`INSERT INTO public."user" (id,name,display_name,email,email_verified,currency,role,created_at,updated_at)
        VALUES (${id}, 'Socket fixture', ${id}, ${id + '@invalid.local'}, false, 'USD', 'crossfire', now(), now())`;
        await sql`INSERT INTO public.session (id,user_id,token,expires_at,created_at,updated_at)
        VALUES (${id + '-session'}, ${id}, ${crypto.randomUUID()}, now() + interval '1 hour', now(), now())`;
      }
      await sql`INSERT INTO team (id,name) VALUES (${teamId}, 'Socket fixture')`;
      await sql`INSERT INTO team_member (team_id,user_id) VALUES (${teamId},${a})`;
      const anonymous = connect();
      await until(() => !!anonymous.close());
      expect(anonymous.close()).toBe(4401);
      const foreign = connect(a, 'https://other.invalid');
      await until(() => !!foreign.close());
      expect(foreign.close()).toBe(4403);
      const ca = connect(a),
        cb = connect(b);
      await until(
        () =>
          ca.events.some(e => e.type === 'app.connected') &&
          cb.events.some(e => e.type === 'app.connected'),
      );
      await sql`SELECT pg_notify('user_notifications', ${JSON.stringify({ userId: a, type: 'notifications.changed' })})`;
      await until(() => ca.events.some(e => e.type === 'notifications.changed'));
      expect(cb.events.some(e => e.type === 'notifications.changed')).toBe(false);
      const recipientClient = connect(recipient);
      await until(() => recipientClient.events.some(e => e.type === 'app.connected'));
      const sent = await app.request(`/messages/with/${recipient}`, {
        method: 'POST',
        headers: { 'test-user': a, 'content-type': 'application/json' },
        body: JSON.stringify({
          body: 'Private socket fixture',
          clientMessageId: crypto.randomUUID(),
        }),
      });
      expect(sent.status).toBe(201);
      await until(
        () =>
          ca.events.some(e => e.type === 'messages.changed') &&
          recipientClient.events.some(e => e.type === 'messages.changed'),
      );
      expect(cb.events.some(e => e.type === 'messages.changed')).toBe(false);
      expect(JSON.stringify(recipientClient.events)).not.toContain('Private socket fixture');
      const sentMessage = await sent.json();
      expect(ca.events.find(e => e.type === 'messages.changed')).toEqual({
        v: 1,
        type: 'messages.changed',
        change: {
          conversationId: sentMessage.conversationId,
          peerId: recipient,
          lastSequence: 1,
          readSequence: 0,
        },
      });
      expect(recipientClient.events.find(e => e.type === 'messages.changed')).toEqual({
        v: 1,
        type: 'messages.changed',
        change: {
          conversationId: sentMessage.conversationId,
          peerId: a,
          lastSequence: 1,
          readSequence: 0,
        },
      });
      cb.send({ type: 'subscribe', subscription: { topic: 'game-results', teamId } });
      await until(() => cb.events.some(e => e.type === 'subscription.denied'));
      ca.send({ type: 'subscribe', subscription: { topic: 'game-results', teamId } });
      await until(() => ca.events.some(e => e.type === 'game_results.connected'));
      invalidateGameResultSockets({ teamId });
      await until(() => ca.events.some(e => e.type === 'game_results.changed'));
      expect(cb.events.some(e => e.type === 'game_results.changed')).toBe(false);
      await sql`DELETE FROM team_member WHERE team_id = ${teamId} AND user_id = ${a}`;
      invalidateGameResultSockets({ teamId });
      await until(() => ca.events.some(e => e.type === 'subscription.denied'));
      expect(ca.events.filter(e => e.type === 'game_results.changed')).toHaveLength(1);
      expect(hasActiveGameResultSockets()).toBe(false);

      // A role change must take effect even on a socket that was already connected.
      await sql`UPDATE public."user" SET role = 'user' WHERE id = ${a}`;
      await sql`SELECT pg_notify('crossfire_invitations', ${JSON.stringify({ lobbyId: crypto.randomUUID(), users: [a] })})`;
      ca.send({ type: 'ping' });
      await until(() => ca.events.some(e => e.type === 'pong'));
      expect(ca.events.some(e => e.type === 'crossfire.invitation')).toBe(false);
      await sql`DELETE FROM public.session WHERE user_id = ${a}`;
      await sql`SELECT pg_notify('user_notifications', ${JSON.stringify({ userId: a, type: 'notifications.changed' })})`;
      await until(() => !!ca.close());
      expect(ca.close()).toBe(4401);
      expect(ca.events.filter(e => e.type === 'notifications.changed')).toHaveLength(1);

      // Interrupt only this service's reserved LISTEN connection, not other DB sessions.
      const listener = await sql.listen('test_realtime_pid', () => {});
      const resyncs = cb.events.filter(e => e.type === 'app.resync').length;
      await sql`SELECT pg_terminate_backend(${listener.state.pid})`;
      await until(() => cb.events.filter(e => e.type === 'app.resync').length > resyncs);
      await listener.unlisten();
      // Restart transport after a gap: connected prompts an authoritative HTTP refresh.
      cb.socket.close();
      await until(() => !!cb.close());
      const reconnected = connect(b);
      await until(() => reconnected.events.some(e => e.type === 'app.connected'));
      reconnected.send({
        type: 'subscribe',
        subscription: { topic: 'live-tournaments', weekendId: crypto.randomUUID() },
      });
      await until(() => reconnected.events.some(e => e.type === 'subscription.denied'));
      reconnected.socket.send('not-json');
      await until(() => !!reconnected.close());
      expect(reconnected.close()).toBe(4400);
    } finally {
      for (const client of clients) client.close();
      await service.stop();
      server.stop(true);
      await sql`DELETE FROM team WHERE id = ${teamId}`;
      await sql`DELETE FROM public."user" WHERE id IN (${a},${b},${recipient})`;
      await sql.end();
      if (oldOrigin === undefined) delete process.env.BETTER_AUTH_URL;
      else process.env.BETTER_AUTH_URL = oldOrigin;
    }
    expect(hasActiveGameResultSockets()).toBe(false);
    expect(hasActiveLiveTournamentSockets()).toBe(false);
  },
  30_000,
);

// Use real DB authorization and publishers with deterministic sink sockets so
// event bursts and query counts are independent of operating-system buffering.
test.skipIf(process.env.NOTIFICATIONS_DB_TEST !== '1')(
  '100 viewers recover a burst with batched fresh authorization and bounded resync',
  async () => {
    const { WSContext } = await import('hono/ws');
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    let authQueries = 0;
    const sql = postgres(url.toString(), {
      max: 4,
      debug: (_connection, query) => {
        if (query.includes('jsonb_to_recordset')) authQueries++;
      },
    });
    const service = new AppRealtime(sql, false);
    const prefix = `burst-${crypto.randomUUID()}`;
    const ids = Array.from({ length: 100 }, (_, i) => `${prefix}-${i}`);
    const sockets: {
      ws: InstanceType<typeof WSContext>;
      messages: { type: string }[];
      closes: number[];
    }[] = [];
    try {
      await sql`INSERT INTO public."user" (id,name,display_name,email,email_verified,currency,created_at,updated_at)
      SELECT id, 'Burst fixture', id, id || '@invalid.local', false, 'USD', now(), now() FROM unnest(${ids}::text[]) AS id`;
      await sql`INSERT INTO public.session (id,user_id,token,expires_at,created_at,updated_at)
      SELECT id, id, id, now() + interval '1 hour', now(), now() FROM unnest(${ids}::text[]) AS id`;
      for (const id of ids) {
        const messages: { type: string }[] = [],
          closes: number[] = [];
        const raw = {
          readyState: 1,
          getBufferedAmount: () => 0,
          send: (data: string) => {
            messages.push(JSON.parse(data));
            return data.length;
          },
        };
        const ws = new WSContext({
          raw,
          readyState: 1,
          send: data => {
            raw.send(String(data));
          },
          close: code => {
            closes.push(code!);
            raw.readyState = 3;
          },
        });
        sockets.push({ ws, messages, closes });
        service.register(ws, { userId: id, sessionId: id });
      }
      await until(() => sockets.every(s => s.messages.some(e => e.type === 'app.connected')));
      for (const { ws } of sockets)
        service.message(
          ws,
          JSON.stringify({ v: 1, type: 'subscribe', subscription: { topic: 'game-results' } }),
        );
      await until(() =>
        sockets.every(s => s.messages.some(e => e.type === 'game_results.connected')),
      );
      const before = authQueries;
      for (let i = 0; i < 100; i++) invalidateGameResultSockets();
      await until(() => sockets.every(s => s.messages.some(e => e.type === 'app.resync')));
      expect(sockets.every(s => s.closes.length === 0)).toBe(true);
      expect(sockets.every(s => s.messages.length <= 19)).toBe(true);
      // 10,000 deliveries collapse to <= 17 authorization batches, not 10,000 queries.
      expect(authQueries - before).toBeLessThanOrEqual(20);
      // Commands within the allowed token burst must fit alongside pending events.
      for (let i = 0; i < 100; i++) invalidateGameResultSockets();
      for (const { ws } of sockets)
        for (let i = 0; i < 25; i++) service.message(ws, JSON.stringify({ v: 1, type: 'ping' }));
      await until(() =>
        sockets.every(s => s.messages.filter(e => e.type === 'pong').length === 25),
      );
      expect(sockets.every(s => s.closes.length === 0)).toBe(true);
      await sql`DELETE FROM public.session WHERE id = ${ids[0]!}`;
      invalidateGameResultSockets();
      await until(() => sockets[0]!.closes.length > 0);
      expect(sockets[0]!.closes[0]).toBe(4401);
    } finally {
      await service.stop();
      await sql`DELETE FROM public."user" WHERE id = ANY(${ids})`;
      await sql.end();
    }
  },
  30_000,
);
