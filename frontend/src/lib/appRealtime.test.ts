import { afterEach, expect, spyOn, test } from 'bun:test';
import { AppRealtimeConnection } from './appRealtime.ts';

class FakeSocket {
  readyState = 0;
  sent: string[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  connected() {
    this.readyState = 1;
    this.event({ v: 1, type: 'app.connected' });
  }
  event(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
const connections: AppRealtimeConnection[] = [];
afterEach(() => {
  for (const connection of connections.splice(0)) connection.stop();
});
function fixture() {
  const sockets: FakeSocket[] = [];
  let authFailures = 0;
  const connection = new AppRealtimeConnection(
    'ws://test.invalid/api/ws/events',
    () => {
      authFailures++;
    },
    () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
  );
  connections.push(connection);
  return { connection, sockets, failures: () => authFailures };
}
test('consumers share one socket, restore subscriptions, and ignore old socket callbacks', () => {
  const { connection, sockets } = fixture();
  const received: string[] = [];
  connection.listen(e => received.push(e.type));
  const unsubscribe = connection.subscribe({ topic: 'game-results' });
  const releaseDuplicate = connection.subscribe({ topic: 'game-results' });
  connection.start();
  connection.start();
  connection.focus();
  expect(sockets).toHaveLength(1);
  sockets[0]!.connected();
  expect(sockets[0]!.sent.map(s => JSON.parse(s).type)).toEqual(['subscribe']);
  releaseDuplicate();
  expect(sockets[0]!.sent).toHaveLength(1);
  sockets[0]!.close();
  connection.focus();
  expect(sockets).toHaveLength(2);
  sockets[1]!.connected();
  expect(sockets[1]!.sent.map(s => JSON.parse(s).type)).toEqual(['subscribe']);
  sockets[0]!.event({ type: 'notifications.changed' });
  expect(received).toEqual(['app.connected', 'app.connected']);
  unsubscribe();
  expect(sockets[1]!.sent.map(s => JSON.parse(s).type)).toEqual(['subscribe', 'unsubscribe']);
  connection.stop();
  connection.focus();
  expect(sockets).toHaveLength(2);
  expect(sockets[1]!.readyState).toBe(3);
});
test('auth rejection stops reconnects; a new session starts independently', async () => {
  const { connection, sockets, failures } = fixture();
  connection.start();
  sockets[0]!.close(4401);
  connection.focus();
  await Bun.sleep(1600);
  expect(sockets).toHaveLength(1);
  expect(failures()).toBe(1);
  connection.stop();
  connection.start();
  expect(sockets).toHaveLength(2);
});
test('nested scopes restore their predecessor and reconnect sends only the active scope', () => {
  const { connection, sockets } = fixture();
  connection.subscribe({ topic: 'game-results' });
  const team = { topic: 'game-results' as const, teamId: crypto.randomUUID() };
  const releaseTeam = connection.subscribe(team);
  connection.start();
  sockets[0]!.connected();
  expect(sockets[0]!.sent.map(s => JSON.parse(s).subscription)).toEqual([team]);
  releaseTeam();
  expect(JSON.parse(sockets[0]!.sent[1]!).subscription).toEqual({ topic: 'game-results' });
});
test('connection limits permit recovery on focus without a rapid retry loop', async () => {
  const { connection, sockets } = fixture();
  connection.start();
  sockets[0]!.close(4429);
  await Bun.sleep(1600);
  expect(sockets).toHaveLength(1);
  connection.focus();
  expect(sockets).toHaveLength(2);
});
test('interleaved user, team, user consumers restore the scope of each surviving consumer', () => {
  const { connection, sockets } = fixture();
  const own = { topic: 'game-results' as const };
  const team = { topic: 'game-results' as const, teamId: crypto.randomUUID() };
  const releaseA = connection.subscribe(own);
  connection.start();
  sockets[0]!.connected();
  const releaseB = connection.subscribe(team);
  const releaseC = connection.subscribe({ ...own });
  releaseC();
  releaseB();
  releaseA();
  expect(sockets[0]!.sent.map(s => JSON.parse(s))).toEqual([
    { v: 1, type: 'subscribe', subscription: own },
    { v: 1, type: 'subscribe', subscription: team },
    { v: 1, type: 'subscribe', subscription: own },
    { v: 1, type: 'subscribe', subscription: team },
    { v: 1, type: 'subscribe', subscription: own },
    { v: 1, type: 'unsubscribe', subscription: own },
  ]);
});
test('focus probes a background socket and replaces it only when the probe goes unanswered', async () => {
  const now = spyOn(Date, 'now').mockReturnValue(10_000);
  try {
    const { connection, sockets } = fixture();
    connection.start();
    sockets[0]!.connected();
    now.mockReturnValue(70_000);
    connection.focus();
    expect(sockets[0]!.readyState).toBe(1);
    expect(JSON.parse(sockets[0]!.sent[0]!)).toEqual({ v: 1, type: 'ping' });
    sockets[0]!.event({ v: 1, type: 'pong' });
    expect(sockets).toHaveLength(1);
    now.mockReturnValue(130_000);
    connection.focus();
    await Bun.sleep(5200);
    expect(sockets[0]!.readyState).toBe(3);
    expect(sockets).toHaveLength(2);
  } finally {
    now.mockRestore();
  }
}, 7000);
test('a broken handshake retries with backoff and unmount cancels pending retry', async () => {
  const { connection, sockets } = fixture();
  connection.start();
  sockets[0]!.close(1006);
  await Bun.sleep(1600);
  expect(sockets).toHaveLength(2);
  sockets[1]!.close(1006);
  connection.stop();
  await Bun.sleep(2600);
  expect(sockets).toHaveLength(2);
}, 6000);
