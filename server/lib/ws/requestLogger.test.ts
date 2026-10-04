import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { upgradeWebSocket, websocket } from 'hono/bun';
import { requestLogger } from './requestLogger.ts';

function fixture(websocketSummaryIntervalMs = 20) {
  const lines: string[] = [];
  const summary = Promise.withResolvers<void>();
  const app = new Hono();
  app.use(
    '*',
    requestLogger({
      print: message => {
        lines.push(message);
        if (message.startsWith('[ws]')) summary.resolve();
      },
      websocketSummaryIntervalMs,
    }),
  );
  app.onError((_error, c) => c.json({ error: 'Internal Server Error' }, 500));
  return { app, lines, summary: summary.promise };
}

test('normal HTTP requests keep their request and response logs', async () => {
  const { app, lines } = fixture();
  app.get('/api/cards', c => c.json({ data: [] }));
  app.get('/api/ws/invitations/crossfire', c => c.json({ error: 'Unauthorized' }, 401));

  expect((await app.request('/api/cards')).status).toBe(200);
  expect((await app.request('/api/ws/invitations/crossfire')).status).toBe(401);
  expect(lines).toHaveLength(4);
  expect(lines[0]).toBe('<-- GET /api/cards');
  expect(lines[2]).toBe('<-- GET /api/ws/invitations/crossfire');
});

test('failed upgrades and server errors stay visible immediately', async () => {
  const { app, lines } = fixture();
  app.get('/api/ws/live-tournaments/missing', c => c.json({ error: 'Not found' }, 404));
  app.get('/api/ws/invitations/crossfire', () => {
    throw new Error('Unavailable');
  });
  const headers = { Upgrade: 'websocket' };

  expect((await app.request('/api/ws/live-tournaments/missing', { headers })).status).toBe(404);
  expect((await app.request('/api/ws/invitations/crossfire', { headers })).status).toBe(500);
  expect(lines).toHaveLength(4);
  await Bun.sleep(40);
  expect(lines).toHaveLength(4);
});

test('summaries reset between active windows and omit query strings', async () => {
  const { app, lines } = fixture();
  // This is the empty response Hono's Bun adapter exposes after upgrading.
  app.get('/api/ws/invitations/crossfire', () => new Response(null));
  const headers = { Upgrade: 'websocket' };
  await app.request('/api/ws/invitations/crossfire?private=value', { headers });
  await app.request('/api/ws/invitations/crossfire', { headers });
  expect(lines).toHaveLength(0);
  await Bun.sleep(40);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain('crossfire-invitations=2');
  expect(lines[0]).not.toContain('private');

  await app.request('/api/ws/invitations/crossfire', { headers });
  await Bun.sleep(40);
  expect(lines).toHaveLength(2);
  expect(lines[1]).toContain('crossfire-invitations=1');
});

test('real upgrades are summarized by endpoint; messages add no request logs', async () => {
  const { app, lines, summary } = fixture(1000);
  app.get('/api/ws/*', c =>
    upgradeWebSocket(c, {
      onMessage(event, ws) {
        if (event.data === 'ping') ws.send('pong');
      },
    }),
  );
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app.fetch, websocket });
  const clients: WebSocket[] = [];
  try {
    for (const path of [
      '/api/ws/events',
      '/api/ws/invitations/crossfire',
      '/api/ws/invitations/crossfire',
      '/api/ws/game-results',
      '/api/ws/live-tournaments/private-weekend-id',
    ]) {
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(`ws://127.0.0.1:${server.port}${path}`);
        clients.push(client);
        client.onopen = () => client.send('ping');
        client.onmessage = event => {
          if (event.data !== 'pong') {
            reject(new Error('Unexpected WebSocket heartbeat response'));
            return;
          }
          resolve();
        };
        client.onerror = () => reject(new Error('WebSocket connection failed'));
      });
    }
    await summary;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('WebSocket upgrade requests');
    expect(lines[0]).toContain('app-events=1');
    expect(lines[0]).toContain('crossfire-invitations=2');
    expect(lines[0]).toContain('game-results=1');
    expect(lines[0]).toContain('live-tournaments=1');
    expect(lines[0]).not.toContain('private-weekend-id');
    await Bun.sleep(1100);
    expect(lines).toHaveLength(1);
  } finally {
    for (const client of clients) client.close();
    void server.stop(true);
    server.unref();
  }
});
