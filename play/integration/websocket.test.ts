import { CrossfireExits } from '../../server/lib/crossfire/exits.ts';
import { CrossfireChat } from '../../server/lib/crossfire/chat.ts';
import { CrossfireBookmarks } from '../../server/lib/crossfire/bookmarks.ts';
import { CrossfireUndo } from '../../server/lib/crossfire/undo.ts';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import type { Principal } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireConnections } from '../../server/lib/crossfire/connections.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { GameWorker } from '../worker/games.ts';
import { ReplayService } from '../history/replay-service.ts';
import { serverMessageSchema } from '../view/parse.ts';
import { createGameServer } from '../worker/server.ts';
import { applyViewDelta } from '../view/delta.ts';
import type { GameView } from '../view/types.ts';
import type { ClientMessage, ServerMessage } from '../view/wire.ts';
import { ids } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to a local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 8, onnotice: () => {} });
const prefix = `socket-test-${randomUUID()}`,
  origin = 'http://localhost:5174';
const principals: Principal[] = [0, 1, 2].map(n => ({
  userId: `${prefix}-${n}`,
  sessionId: `${prefix}-session-${n}`,
}));
const a = principals[0]!,
  b = principals[1]!,
  spectator = principals[2]!;
type Service = {
  worker: GameWorker;
  service: ReturnType<typeof createGameServer>;
  address: string;
};
const decks: string[] = [],
  lobbyIds: string[] = [],
  services: Service[] = [];
const probes: Probe[] = [],
  children: Bun.Subprocess[] = [];
const faults: string[] = [];
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, catalog),
  connections = new CrossfireConnections(sql, origin);
const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: true };
async function session(p: Principal) {
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${p.sessionId}, ${randomUUID()}, now() + interval '1 hour', ${p.userId}, now(), now())`;
}
beforeAll(async () => {
  for (const p of principals) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role)
      VALUES (${p.userId}, 'Synthetic socket fixture', ${p.userId + '@invalid.local'}, false, now(), now(), ${p.userId}, 'USD', 'crossfire')`;
    await session(p);
    const deck = randomUUID();
    decks.push(deck);
    await sql`INSERT INTO deck (id, user_id, format, leader_card_id_1, base_card_id)
      VALUES (${deck}, ${p.userId}, 1, ${ids.leader}, ${ids.base})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${deck}, ${ids.marine}, 1, 12)`;
  }
});
afterEach(async () => {
  for (const probe of probes.splice(0)) probe.socket.close();
  await Promise.all(services.splice(0).map(s => s.service.stop()));
  for (const child of children.splice(0)) {
    child.kill();
    await child.exited;
  }
  expect(faults.splice(0)).toEqual([]);
});
afterAll(async () => {
  const games =
    await sql`SELECT game_id FROM play.lobbies WHERE id = ANY(${lobbyIds}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.lobbies WHERE id = ANY(${lobbyIds})`;
  await sql`DELETE FROM play.games WHERE id = ANY(${games.map(g => g.game_id)})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck WHERE id = ANY(${decks})`;
  await sql`DELETE FROM session WHERE user_id = ANY(${principals.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${principals.map(p => p.userId)})`;
  await sql.end();
});
async function start(proposed = policy) {
  const lobby = await lobbies.create(a, decks[0]!, proposed);
  lobbyIds.push(lobby.id);
  return lobbies.join(b, lobby.id, decks[1]!, proposed);
}
function serve(
  options: Partial<Parameters<typeof createGameServer>[2]> = {},
  replayService = new ReplayService(url!),
  notifyReport?: Parameters<typeof createGameServer>[9],
): Service {
  const worker = new GameWorker(new PostgresGameStore(sql), { idleMs: 0 });
  const service = createGameServer(
    worker,
    connections,
    { origin, port: 0, maintenanceMs: 5000, ...options },
    op => faults.push(op),
    replayService,
    new CrossfireUndo(sql),
    new CrossfireBookmarks(sql),
    undefined,
    new CrossfireChat(sql),
    notifyReport,
    new CrossfireExits(sql),
  );
  const result = { worker, service, address: `ws://127.0.0.1:${service.server.port}` };
  services.push(result);
  return result;
}
class Probe {
  readonly socket: WebSocket;
  readonly opened: Promise<void>;
  readonly closed: Promise<CloseEvent>;
  readonly history: ServerMessage[] = [];
  view?: GameView;
  readonly #messages: ServerMessage[] = [];
  readonly #waiters: (() => void)[] = [];
  constructor(address: string, gameId: string, requestOrigin = origin) {
    this.socket = new WebSocket(`${address}/api/ws/crossfire/${gameId}`, {
      headers: { Origin: requestOrigin },
    });
    this.opened = new Promise(resolve => {
      this.socket.onopen = () => resolve();
    });
    this.closed = new Promise(resolve => {
      this.socket.onclose = resolve;
    });
    this.socket.onmessage = event => {
      const message = serverMessageSchema.parse(JSON.parse(event.data as string));
      this.history.push(message);
      this.#messages.push(message);
      if (message.type === 'snapshot') this.view = message.view;
      if (message.type === 'replay') {
        if (message.update.type === 'snapshot') this.view = message.update.view;
        else if (message.update.delta) this.view = applyViewDelta(this.view!, message.update.delta);
      }
      if (message.type === 'delta') this.view = applyViewDelta(this.view!, message.delta);
      for (const waiter of this.#waiters.splice(0)) waiter();
    };
    probes.push(this);
  }
  send(message: ClientMessage) {
    this.socket.send(JSON.stringify(message));
  }
  async next<T extends ServerMessage['type']>(
    type: T,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const until = Date.now() + 3000;
    for (;;) {
      const index = this.#messages.findIndex(m => m.type === type);
      if (index >= 0)
        return this.#messages.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
      if (Date.now() >= until) throw new Error(`Timed out waiting for ${type}`);
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 25);
        this.#waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }
}
async function connect(
  address: string,
  lobby: Awaited<ReturnType<typeof start>>,
  p = a,
  showRevealedHands = true,
) {
  const ticket = await connections.issue(
    p,
    lobby.id,
    p === spectator ? 'spectator' : 'player',
    origin,
  );
  const probe = new Probe(address, ticket.gameId);
  await probe.opened;
  probe.send({ type: 'authenticate', wireVersion: 1, ticket: ticket.ticket, showRevealedHands });
  await probe.next('snapshot');
  return probe;
}
function command(probe: Probe): Extract<ClientMessage, { type: 'command' }> {
  const view = probe.view!,
    decision = view.decision!;
  return {
    type: 'command',
    commandId: randomUUID(),
    command: {
      gameId: view.gameId,
      epoch: view.epoch,
      expectedRevision: view.revision,
      decisionId: decision.id,
      optionId: decision.options[0]!.id,
      selections: decision.selection?.cards.slice(0, decision.selection.min) ?? [],
    },
  };
}

async function reachResources(players: Probe[]) {
  for (
    let step = 0;
    step < 5 && !players.every(p => p.view!.decision?.kind === 'resource');
    step++
  ) {
    const actor = players.find(p => p.view!.decision)!;
    actor.send(command(actor));
    await actor.next('ack');
    for (const p of players) {
      p.send({ type: 'resync' });
      await p.next('snapshot');
    }
  }
  expect(players.every(p => p.view!.decision?.kind === 'resource')).toBe(true);
}

test('no state before ticket admission; wrong Origin, reused ticket, invalid protocol and missing auth close', async () => {
  const { address } = serve({ authenticationMs: 100 }),
    lobby = await start();
  const wrong = new Probe(address, lobby.gameId!, 'https://other.invalid');
  expect((await wrong.closed).code).toBe(4403);
  expect(wrong.history).toEqual([]);
  const silent = new Probe(address, lobby.gameId!);
  await silent.opened;
  expect((await silent.closed).code).toBe(4401);
  expect(silent.history).toEqual([]);
  const ticket = await connections.issue(a, lobby.id, 'player', origin);
  const accepted = new Probe(address, lobby.gameId!);
  await accepted.opened;
  expect(accepted.history).toEqual([]);
  accepted.send({ type: 'authenticate', wireVersion: 1, ticket: ticket.ticket });
  await accepted.next('snapshot');
  const reused = new Probe(address, lobby.gameId!);
  await reused.opened;
  reused.send({ type: 'authenticate', wireVersion: 1, ticket: ticket.ticket });
  expect((await reused.closed).code).toBe(4401);
  expect(reused.history).toEqual([]);
  const malformed = new Probe(address, lobby.gameId!);
  await malformed.opened;
  malformed.socket.send(
    JSON.stringify({ type: 'authenticate', wireVersion: 99, ticket: ticket.ticket }),
  );
  expect((await malformed.closed).code).toBe(4400);
  expect(malformed.history).toEqual([]);
});

test('players receive private views and committed deltas; spectator hand preferences are scoped and cannot command', async () => {
  const { address } = serve(),
    lobby = await start();
  const p1 = await connect(address, lobby),
    p2 = await connect(address, lobby, b);
  const watcher = await connect(address, lobby, spectator, false);
  const actor = p1.view!.decision ? p1 : p2;
  actor.send(command(actor));
  expect((await actor.next('ack')).duplicate).toBe(false);
  for (const p of [p1, p2]) {
    expect(p.view!.cards.filter(c => c.zone === 'hand')).toHaveLength(6);
    expect(p.history.filter(m => m.type === 'snapshot')).toHaveLength(1);
    expect(p.history.some(m => m.type === 'delta')).toBe(true);
  }
  expect(watcher.view!.cards.filter(c => c.zone === 'hand')).toHaveLength(0);
  expect(watcher.view!.decision).toBeNull();
  const oldEpoch = watcher.view!.epoch;
  watcher.send({ type: 'preferences', showRevealedHands: true });
  const revealed = await watcher.next('snapshot');
  expect(revealed.view.epoch).not.toBe(oldEpoch);
  expect(revealed.view.cards.filter(c => c.zone === 'hand')).toHaveLength(12);
  watcher.send({ type: 'preferences', showRevealedHands: false });
  expect((await watcher.next('snapshot')).view.cards.filter(c => c.zone === 'hand')).toHaveLength(
    0,
  );
  const traffic = JSON.stringify([...p1.history, ...p2.history, ...watcher.history]);
  for (const secret of [
    a.userId,
    a.sessionId,
    decks[0]!,
    'instanceId',
    'requestHash',
    'connectionEpoch',
    'execution',
    'leaseUntil',
  ])
    expect(traffic).not.toContain(secret);
  watcher.send(command(p1.view!.decision ? p1 : p2));
  expect((await watcher.closed).code).toBe(4403);
  expect((await new PostgresGameStore(sql).load(lobby.gameId!)).sequence).toBe(1);
});

test('early resources stay private over WebSockets and survive worker recovery before initiative confirms', async () => {
  const first = serve(),
    lobby = await start({ ...policy, handsToSpectators: false });
  const players = [await connect(first.address, lobby), await connect(first.address, lobby, b)];
  const watcher = await connect(first.address, lobby, spectator);
  await reachResources(players);
  watcher.send({ type: 'resync' });
  await watcher.next('snapshot');
  const earlyIndex = players.findIndex(p => !!p.view!.decision?.resourcePlan);
  expect(earlyIndex).toBeGreaterThanOrEqual(0);
  const early = players[earlyIndex]!,
    initiative = players[1 - earlyIndex]!;
  const before = structuredClone(initiative.view),
    publicBefore = structuredClone(watcher.view);
  const confirmation = command(early);
  early.send(confirmation);
  expect((await early.next('ack')).duplicate).toBe(false);
  expect(early.view!.decision?.resourcePlan?.confirmed).toBe(true);
  expect(early.view!.decision?.resourcePlan?.cards).toHaveLength(2);
  expect(early.view!.cards.filter(c => c.zone === 'resources')).toHaveLength(0);
  expect(initiative.view).toEqual(before);
  expect(watcher.view).toEqual(publicBefore);

  await first.service.stop();
  const recovered = serve();
  const resumed = [
    await connect(recovered.address, lobby),
    await connect(recovered.address, lobby, b),
  ];
  expect(resumed[earlyIndex]!.view!.decision?.resourcePlan?.confirmed).toBe(true);
  const firstActor = resumed[1 - earlyIndex]!;
  firstActor.send(command(firstActor));
  await firstActor.next('ack');
  for (const p of resumed) {
    p.send({ type: 'resync' });
    await p.next('snapshot');
    expect(p.view!.phase).toBe('action');
    for (const player of p.view!.players)
      expect(
        p.view!.cards.filter(c => c.zone === 'resources' && c.controller === player.id),
      ).toHaveLength(2);
  }
});

test('both resource confirmations may already be in flight in either initiative order', async () => {
  for (const earlyFirst of [false, true]) {
    const server = serve(),
      lobby = await start();
    const players = [await connect(server.address, lobby), await connect(server.address, lobby, b)];
    await reachResources(players);
    const early = players.find(p => p.view!.decision?.resourcePlan)!;
    const initiative = players.find(p => p !== early)!;
    const order = earlyFirst ? [early, initiative] : [initiative, early];
    const commands = order.map(command);
    order[0]!.send(commands[0]!);
    await order[0]!.next('ack');
    // Deliberately use the other already-built command, before its new view.
    order[1]!.send(commands[1]!);
    await order[1]!.next('ack');
    for (const p of players) {
      p.send({ type: 'resync' });
      await p.next('snapshot');
      expect(p.view!.phase).toBe('action');
      expect(p.history.some(m => m.type === 'error')).toBe(false);
    }
  }
});

test('different games are isolated; reveal preference cannot override the agreed game policy', async () => {
  const { address } = serve(),
    first = await start(),
    second = await start({ ...policy, handsToSpectators: false });
  const p1 = await connect(address, first),
    p2 = await connect(address, first, b);
  const other1 = await connect(address, second),
    other2 = await connect(address, second, b);
  const watcher = await connect(address, second, spectator);
  const count = other1.history.length,
    actor = p1.view!.decision ? p1 : p2;
  actor.send(command(actor));
  await actor.next('ack');
  expect(other1.history).toHaveLength(count);
  expect(JSON.stringify(other1.history)).not.toContain(first.gameId!);
  const otherActor = other1.view!.decision ? other1 : other2;
  otherActor.send(command(otherActor));
  await otherActor.next('ack');
  watcher.send({ type: 'preferences', showRevealedHands: true });
  expect((await watcher.next('snapshot')).view.cards.filter(c => c.zone === 'hand')).toHaveLength(
    0,
  );
});

test('seat replacement closes the old socket and acknowledges committed old intent using the new connection', async () => {
  const { address } = serve(),
    lobby = await start();
  const p1 = await connect(address, lobby),
    p2 = await connect(address, lobby, b);
  const actor = p1.view!.decision ? p1 : p2,
    intent = command(actor);
  actor.send(intent);
  await actor.next('ack');
  const replacement = await connect(address, lobby, actor === p1 ? a : b);
  expect((await actor.closed).code).toBe(4409);
  expect(replacement.view!.epoch).not.toBe(actor.view!.epoch);
  replacement.send(intent);
  expect((await replacement.next('ack')).duplicate).toBe(true);
  replacement.send({ ...intent, command: { ...intent.command, optionId: '0'.repeat(32) } });
  expect((await replacement.next('error')).code).toBe('conflict');
  replacement.send({ ...intent, commandId: randomUUID() });
  expect((await replacement.next('error')).code).toBe('resync-required');
  const epoch = replacement.view!.epoch;
  replacement.send({ type: 'resync' });
  expect((await replacement.next('snapshot')).view.epoch).not.toBe(epoch);
  expect((await new PostgresGameStore(sql).load(lobby.gameId!)).sequence).toBe(1);
});

test('spectator capacity reserves both player seats and shutdown stops the listener', async () => {
  const { address, service } = serve({ maxRoomConnections: 3 });
  const lobby = await start();
  await connect(address, lobby, spectator);
  const ticket = await connections.issue(spectator, lobby.id, 'spectator', origin);
  const excess = new Probe(address, lobby.gameId!);
  await excess.opened;
  excess.send({ type: 'authenticate', wireVersion: 1, ticket: ticket.ticket });
  expect((await excess.closed).code).toBe(1013);
  expect(excess.history).toEqual([]);
  await connect(address, lobby);
  await connect(address, lobby, b);
  expect(service.connectionCount).toBe(3);
  expect(service.statistics).toEqual({
    connections: 3,
    liveConnections: 3,
    replayConnections: 0,
    rooms: 1,
  });
  await service.stop();
  expect(service.connectionCount).toBe(0);
  await expect(fetch(address.replace('ws:', 'http:') + '/health')).rejects.toThrow();
});

test('closed sockets retain capacity while authentication work drains', async () => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  let attempts = 0;
  class DelayedConnections extends CrossfireConnections {
    override async redeem(...args: Parameters<CrossfireConnections['redeem']>) {
      if (++attempts === 2) entered.resolve();
      await release.promise;
      return super.redeem(...args);
    }
  }
  const worker = new GameWorker(new PostgresGameStore(sql));
  const service = createGameServer(
    worker,
    new DelayedConnections(sql, origin),
    {
      origin,
      port: 0,
      maxConnections: 2,
    },
    op => faults.push(op),
  );
  const address = `ws://127.0.0.1:${service.server.port}`;
  services.push({ worker, service, address });
  const clients = [new Probe(address, 'game-waiting'), new Probe(address, 'game-waiting')];
  try {
    await Promise.all(clients.map(client => client.opened));
    for (const client of clients)
      client.send({ type: 'authenticate', wireVersion: 1, ticket: 'a'.repeat(43) });
    await entered.promise;
    for (const client of clients) client.socket.close();
    await Promise.all(clients.map(client => client.closed));
    // Normal HTTP requests exercise the same pre-upgrade capacity gate without
    // queuing another auth attempt. A free slot would instead return 426.
    const response = await fetch(
      address.replace('ws:', 'http:') + '/api/ws/crossfire/game-waiting',
    );
    expect(response.status).toBe(503);
    expect(service.connectionCount).toBe(2);
  } finally {
    release.resolve();
  }
  for (let i = 0; i < 30 && service.connectionCount; i++) await Bun.sleep(10);
  expect(service.connectionCount).toBe(0);
  expect(worker.count).toBe(0);
});

test('idle sign-out is revalidated and a new session can reconnect the same seat', async () => {
  const { address, service } = serve(),
    lobby = await start();
  const player = await connect(address, lobby),
    opponent = await connect(address, lobby, b);
  await sql`DELETE FROM session WHERE id = ${a.sessionId}`;
  try {
    await service.maintain();
    expect((await player.closed).code).toBe(4401);
    expect(opponent.socket.readyState).toBe(WebSocket.OPEN);
  } finally {
    await session(a);
  }
  const next = await connect(address, lobby);
  expect(next.view!.gameId).toBe(lobby.gameId!);
});

test('idle role revocation closes the socket; regranting restores access to the same seat', async () => {
  const { address, service } = serve(),
    lobby = await start();
  const player = await connect(address, lobby),
    opponent = await connect(address, lobby, b);
  await sql`UPDATE "user" SET role = 'admin' WHERE id = ${a.userId}`;
  try {
    await service.maintain();
    expect((await player.closed).code).toBe(4403);
    expect(opponent.socket.readyState).toBe(WebSocket.OPEN);
  } finally {
    await sql`UPDATE "user" SET role = 'admin,crossfire' WHERE id = ${a.userId}`;
  }
  const next = await connect(address, lobby);
  expect(next.view!.gameId).toBe(lobby.gameId!);
});

test('message floods and oversized frames close without committing, releasing their game binding', async () => {
  const { address, service, worker } = serve(),
    lobby = await start();
  const player = await connect(address, lobby);
  for (let i = 0; i < 40; i++) player.send({ type: 'resync' });
  expect((await player.closed).code).toBe(4408);
  for (let i = 0; i < 20 && worker.count; i++) {
    await service.maintain();
    await Bun.sleep(10);
  }
  expect(worker.count).toBe(0);
  const oversized = new Probe(address, lobby.gameId!);
  await oversized.opened;
  oversized.socket.send('x'.repeat(17 * 1024));
  expect([1006, 1009]).toContain((await oversized.closed).code);
  expect(oversized.history).toEqual([]);
  expect((await new PostgresGameStore(sql).load(lobby.gameId!)).sequence).toBe(0);
});

async function processServer() {
  const reservation = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() });
  const port = reservation.port!;
  await reservation.stop(true);
  const child = Bun.spawn([process.execPath, 'play/worker/index.ts'], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      ...process.env,
      DATABASE_URL: url!,
      BETTER_AUTH_URL: origin,
      CROSSFIRE_ENABLED: '1',
      CROSSFIRE_PORT: String(port),
      CROSSFIRE_HOST: '127.0.0.1',
    },
    stdout: 'ignore',
    stderr: 'pipe',
  });
  children.push(child);
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error('Worker process exited before listening');
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok)
        return { child, address: `ws://127.0.0.1:${port}` };
    } catch {
      /* startup */
    }
    await Bun.sleep(20);
  }
  throw new Error('Worker process did not start');
}
test('a killed worker recovers its committed game in a fresh process and deduplicates the lost-response retry', async () => {
  const lobby = await start(),
    first = await processServer();
  const p1 = await connect(first.address, lobby),
    p2 = await connect(first.address, lobby, b);
  const actor = p1.view!.decision ? p1 : p2,
    intent = command(actor);
  actor.send(intent);
  await actor.next('ack');
  const before = actor.view!;
  first.child.kill('SIGKILL');
  await first.child.exited;
  await sql`UPDATE play.games SET lease_until = clock_timestamp() - interval '1 second' WHERE id = ${lobby.gameId!}`;
  const second = await processServer(),
    recovered = await connect(second.address, lobby, actor === p1 ? a : b);
  expect(recovered.view!.epoch).not.toBe(before.epoch);
  expect(recovered.view!.players).toEqual(before.players);
  expect(recovered.view!.cards.map(c => c.face)).toEqual(before.cards.map(c => c.face));
  recovered.send(intent);
  expect((await recovered.next('ack')).duplicate).toBe(true);
  expect((await new PostgresGameStore(sql).load(lobby.gameId!)).sequence).toBe(1);
  second.child.kill('SIGTERM');
  expect(await second.child.exited).toBe(0);
}, 15_000);

async function connectReplay(address: string, lobby: Awaited<ReturnType<typeof start>>, p = a) {
  const ticket = await connections.issue(
    p,
    lobby.id,
    p === spectator ? 'spectator' : 'player',
    origin,
    'replay',
  );
  const probe = new Probe(address, ticket.gameId);
  await probe.opened;
  probe.send({ type: 'authenticate', wireVersion: 1, ticket: ticket.ticket });
  const first = await probe.next('replay');
  expect(first.update.type).toBe('snapshot');
  return probe;
}

test('replay sessions preserve live seats, isolate private perspectives and navigate by permitted deltas', async () => {
  const lobby = await start();
  const s = serve();
  const p1 = await connect(s.address, lobby),
    p2 = await connect(s.address, lobby, b);
  const player = p1.view!.decision ? p1 : p2;
  const review = await connectReplay(s.address, lobby);
  expect(s.worker.count).toBe(1);
  expect(s.service.statistics).toEqual({
    connections: 3,
    liveConnections: 2,
    replayConnections: 1,
    rooms: 1,
  });
  const request = command(player);
  player.send(request);
  await player.next('ack');
  await review.next('replay-live');
  const nextId = randomUUID();
  review.send({ type: 'replay-seek', requestId: nextId, seek: { kind: 'end' } });
  const end = await review.next('replay');
  expect(end.requestId).toBe(nextId);
  expect(end.update.type).toBe('delta');
  expect(
    review.view!.cards.filter(c => c.zone === 'hand' && c.owner === 'p1').every(c => c.face),
  ).toBe(true);
  expect(
    review.view!.cards.filter(c => c.zone === 'hand' && c.owner === 'p2').every(c => !c.face),
  ).toBe(true);
  for (const secret of ['stateHash', 'requestHash', 'checkpoint', 'execution', 'history_key'])
    expect(JSON.stringify(end)).not.toContain(secret);
  const revision = review.view!.revision;
  review.send({ type: 'replay-seek', requestId: randomUUID(), seek: { kind: 'step', offset: -1 } });
  const previous = await review.next('replay');
  expect(previous.position.atStart).toBe(true);
  expect(review.view!.revision).toBeGreaterThan(revision);
  expect(review.view!.cards.filter(c => c.zone === 'hand')).toHaveLength(0);
  review.send({
    type: 'replay-seek',
    requestId: randomUUID(),
    seek: { kind: 'end' },
    perspective: 'public',
  });
  const publicView = await review.next('replay');
  expect(publicView.update.type).toBe('snapshot');
  expect(review.view!.cards.filter(c => c.zone === 'hand').every(c => !c.face)).toBe(true);
  review.send(request);
  expect((await review.closed).code).toBe(4403);
  expect(player.history.some(m => m.type === 'ack')).toBe(true);
});

test('replay-only spectators acquire no live game lease and current consent changes replace the permission epoch', async () => {
  const lobby = await start();
  const s = serve();
  const p1 = await connect(s.address, lobby),
    p2 = await connect(s.address, lobby, b);
  const player = p1.view!.decision ? p1 : p2;
  player.send(command(player));
  await player.next('ack');
  const review = await connectReplay(s.address, lobby, spectator);
  review.send({ type: 'replay-seek', requestId: randomUUID(), seek: { kind: 'end' } });
  await review.next('replay');
  expect(review.view!.cards.filter(c => c.zone === 'hand').every(c => c.face)).toBe(true);
  const epoch = review.view!.epoch;
  await sql`UPDATE play.lobbies SET hands_to_spectators = false WHERE id = ${lobby.id}`;
  review.send({ type: 'replay-seek', requestId: randomUUID(), seek: { kind: 'refresh' } });
  const hidden = await review.next('replay');
  expect(hidden.update.type).toBe('snapshot');
  expect(review.view!.epoch).not.toBe(epoch);
  expect(review.view!.cards.filter(c => c.zone === 'hand').every(c => !c.face)).toBe(true);
  p1.socket.close();
  p2.socket.close();
  await Promise.all([p1.closed, p2.closed]);
  const deadline = Date.now() + 1000;
  while (s.service.connectionCount > 1 && Date.now() < deadline) await Bun.sleep(5);
  await s.service.maintain();
  expect(s.worker.count).toBe(0);
  review.send({ type: 'replay-seek', requestId: randomUUID(), seek: { kind: 'start' } });
  await review.next('replay');
  expect(s.worker.count).toBe(0);
});

test('a newer replay seek supersedes work already reconstructing an earlier request', async () => {
  const lobby = await start();
  const replayService = new ReplayService(url!);
  const original = replayService.seek.bind(replayService);
  let hold = false,
    entered!: () => void,
    release!: () => void;
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  replayService.seek = async (...args) => {
    const result = await original(...args);
    if (hold) {
      hold = false;
      entered();
      await gate;
    }
    return result;
  };
  const s = serve({}, replayService);
  const review = await connectReplay(s.address, lobby);
  const obsolete = randomUUID(),
    latest = randomUUID();
  hold = true;
  review.send({ type: 'replay-seek', requestId: obsolete, seek: { kind: 'end' } });
  await started;
  review.send({ type: 'replay-seek', requestId: latest, seek: { kind: 'start' } });
  // Give the socket ingress a turn while reconstruction is deliberately held.
  await Bun.sleep(10);
  release();
  expect((await review.next('replay')).requestId).toBe(latest);
  expect(review.history.some(m => m.type === 'replay' && m.requestId === obsolete)).toBe(false);
});

test('report submission delivers after commit outside the game queue and preserves the report on delivery failure', async () => {
  const lobby = await start();
  const notified: string[] = [];
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  const s = serve({}, new ReplayService(url!), async id => {
    // A separate transaction can already see the complete report and outbox.
    const [saved] = await sql`SELECT r.checkpoint IS NOT NULL AS snapshot,n.status
      FROM play.problem_reports r JOIN play.report_notifications n ON n.report_id=r.id WHERE r.id=${id}`;
    expect(saved).toMatchObject({ snapshot: true, status: 'pending' });
    notified.push(id);
    entered();
    await gate;
    throw new Error('Synthetic Discord failure');
  });
  const first = await connect(s.address, lobby),
    second = await connect(s.address, lobby, b);
  while (first.view!.phase !== 'action' || second.view!.phase !== 'action') {
    const actor = [first, second].find(
      p => p.view?.decision && !p.view.decision.resourcePlan?.confirmed,
    )!;
    actor.send(command(actor));
    await actor.next('ack');
  }
  const actor = [first, second].find(
    p => p.view?.decision && !p.view.decision.resourcePlan?.confirmed,
  )!;
  const reporter = actor === first ? second : first;
  const base = {
    type: 'bookmark' as const,
    label: 'Bug',
    epoch: reporter.view!.epoch,
    revision: reporter.view!.revision,
  };
  reporter.send({ ...base, id: randomUUID() });
  await reporter.next('bookmark-saved');
  expect(notified).toEqual([]);
  reporter.send({
    ...base,
    id: randomUUID(),
    revision: base.revision + 100,
    report: 'Stale report',
  });
  await reporter.next('error');
  expect(notified).toEqual([]);
  const id = randomUUID();
  try {
    reporter.send({ ...base, id, report: 'Unexpected unit damage' });
    expect((await reporter.next('bookmark-saved')).bookmark.id).toBe(id);
    await started;
    // This real action must finish while Discord delivery is still held.
    const pass = command(actor);
    pass.command.optionId = actor.view!.decision!.options.find(o => o.kind === 'pass')!.id;
    actor.send(pass);
    await actor.next('ack');
  } finally {
    release();
  }
  reporter.send({ type: 'resync' });
  await reporter.next('snapshot');
  expect(notified).toEqual([id]);
  expect(faults.pop()).toBe('report-notification');
  // Report success must not become a misleading request error after Discord fails.
  expect(reporter.history.filter(m => m.type === 'error')).toHaveLength(1);
  expect((await sql`SELECT id FROM play.problem_reports WHERE id=${id}`).length).toBe(1);
});

test('undo pauses both seats, survives reconnect, replaces handles on acceptance and rejects abandoned commands', async () => {
  const lobby = await start(),
    server = serve();
  let first = await connect(server.address, lobby),
    second = await connect(server.address, lobby, b);
  const others = [first, second];
  while (first.view!.phase !== 'action' || second.view!.phase !== 'action') {
    const actor = others.find(p => p.view?.decision && !p.view.decision.resourcePlan?.confirmed)!;
    actor.send(command(actor));
    await actor.next('ack');
  }
  const actor = others.find(p => p.view?.decision && !p.view.decision.resourcePlan?.confirmed)!,
    opponent = others.find(p => p !== actor)!;
  const pass = command(actor);
  pass.command.optionId = actor.view!.decision!.options.find(o => o.kind === 'pass')!.id;
  actor.send(pass);
  await actor.next('ack');
  actor.send({
    type: 'bookmark',
    id: randomUUID(),
    label: 'Before undo',
    epoch: actor.view!.epoch,
    revision: actor.view!.revision,
  });
  const saved = await actor.next('bookmark-saved');
  expect(saved.bookmark.label).toBe('Before undo');
  expect(saved.bookmark.position).toMatch(/^[a-f0-9]{32}$/);
  const abandoned = command(opponent),
    oldEpoch = opponent.view!.epoch;
  // Consume initial status messages before observing the new request.
  await first.next('undo-state');
  await second.next('undo-state');
  const request = {
    type: 'undo' as const,
    action: 'request' as const,
    id: randomUUID(),
    epoch: actor.view!.epoch,
    revision: actor.view!.revision,
  };
  actor.send(request);
  expect((await opponent.next('undo-state')).pending?.id).toBe(request.id);
  await actor.next('undo-state');
  opponent.send(abandoned);
  expect((await opponent.next('error')).code).toBe('undo-pending');
  const reconnect = await connect(server.address, lobby, actor === first ? a : b);
  expect((await reconnect.next('undo-state')).pending?.id).toBe(request.id);
  opponent.send({ type: 'undo', action: 'approve', id: request.id });
  await opponent.next('snapshot');
  await opponent.next('undo-state');
  expect(opponent.view!.epoch).not.toBe(oldEpoch);
  opponent.send(abandoned);
  expect((await opponent.next('error')).code).toBe('resync-required');
  const journal = await new PostgresGameStore(sql).readHistory(lobby.gameId!);
  expect(journal.journal.at(-1)?.control?.kind).toBe('undo');
  const count = journal.sequence;
  opponent.send({ type: 'undo', action: 'approve', id: request.id });
  await opponent.next('undo-state');
  expect((await new PostgresGameStore(sql).load(lobby.gameId!)).sequence).toBe(count);
});

test('player chat persists, deduplicates, catches up on reconnect and stays out of spectator/replay views', async () => {
  const lobby = await start(),
    s = serve(),
    p1 = await connect(s.address, lobby, a),
    p2 = await connect(s.address, lobby, b),
    watch = await connect(s.address, lobby, spectator);
  const before = (await new PostgresGameStore(sql).load(lobby.gameId!)).sequence;
  await p1.next('chat');
  await p2.next('chat');
  const id = randomUUID();
  p1.send({ type: 'chat-send', id, text: '<b>Hello from a player</b>' });
  const first = await p2.next('chat');
  expect(first.messages[0]?.text).toBe('<b>Hello from a player</b>');
  expect(first.messages[0]?.afterEvent).toBe(p1.view!.events.at(-1)?.order ?? 0);
  await p1.next('chat');
  p1.send({ type: 'chat-send', id, text: '<b>Hello from a player</b>' });
  expect((await p2.next('chat')).messages[0]?.id).toBe(id);
  const reopened = await connect(s.address, lobby, a);
  const recoveredChat = (await reopened.next('chat')).messages;
  expect(recoveredChat.map(m => m.id)).toEqual([id]);
  expect(recoveredChat[0]?.afterEvent).toBe(first.messages[0]?.afterEvent);
  expect(watch.history.some(m => m.type === 'chat')).toBe(false);
  expect((await new PostgresGameStore(sql).load(lobby.gameId!)).sequence).toBe(before);
  const ticketForChecks = await connections.issue(b, lobby.id, 'player', origin, 'replay');
  const grantForChecks = await connections.redeem(ticketForChecks.ticket, lobby.gameId!, origin);
  await expect(new CrossfireChat(sql).list(grantForChecks)).rejects.toThrow('denied');

  watch.send({ type: 'chat-send', id: randomUUID(), text: 'Not allowed' });
  expect((await watch.closed).code).toBe(4403);
  const ticket = await connections.issue(a, lobby.id, 'player', origin, 'replay');
  const r = new Probe(s.address, ticket.gameId);
  await r.opened;
  r.send({ type: 'authenticate', wireVersion: 1, ticket: ticket.ticket });
  await r.next('replay');
  expect(r.history.some(m => m.type === 'chat')).toBe(false);
  r.send({ type: 'chat-send', id: randomUUID(), text: 'Not allowed' });
  expect((await r.closed).code).toBe(4403);
});

test('HTTP-authorized exits finish through maintenance and broadcast the terminal view', async () => {
  const lobby = await start(),
    { address, service } = serve();
  const opponent = await connect(address, lobby, b);
  await new CrossfireExits(sql).leave(a, lobby.id); // No socket for the leaving player.
  await service.maintain();
  await opponent.next('delta');
  expect(opponent.view!.result).toEqual({ winner: 'p2', reason: 'concession' });
});
test('only a live player can concede the current game; retry has one journal receipt', async () => {
  const lobby = await start(),
    { address } = serve();
  const player = await connect(address, lobby),
    watcher = await connect(address, lobby, spectator);
  watcher.send({
    type: 'concede',
    commandId: randomUUID(),
  });
  expect((await watcher.closed).code).toBe(4403);
  const message = {
    type: 'concede' as const,
    commandId: randomUUID(),
  };
  player.send(message);
  await player.next('ack');
  expect(player.view!.result).toEqual({ winner: 'p2', reason: 'concession' });
  player.send(message);
  const ack = await player.next('ack');
  expect(ack.type === 'ack' && ack.duplicate).toBe(true);
  expect(await sql`SELECT * FROM play.match_exits WHERE game_id = ${lobby.gameId!}`).toHaveLength(
    0,
  );
});
