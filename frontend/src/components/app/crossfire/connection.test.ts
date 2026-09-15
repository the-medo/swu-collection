import { expect, test } from 'bun:test';
import { CrossfireConnection } from './connection.ts';
import {
  PROTOCOL_VERSION,
  type GameView,
  type ServerMessage,
} from '../../../../../play/view/types.ts';

const h = (n: number) => n.toString(16).padStart(32, '0');
const view = (epoch = h(1)): GameView => ({
  protocolVersion: PROTOCOL_VERSION,
  gameId: 'game-browser',
  epoch,
  revision: 0,
  phase: 'setup',
  round: 1,
  activePlayer: 'p1',
  initiative: { holder: 'p1', claimed: false },
  result: null,
  players: [
    { id: 'p1', handCount: 0, deckCount: 12 },
    { id: 'p2', handCount: 0, deckCount: 12 },
  ],
  cards: [],
  events: [],
  privateDeckTop: null,
  scheduled: [],
  decision: {
    id: h(2),
    kind: 'initiative',
    source: null,
    effect: null,
    inspectedCards: [],
    selection: null,
    options: [
      {
        id: h(3),
        kind: 'initiative',
        cards: [],
        playerId: 'p1',
        piloting: null,
        exploit: null,
        smuggle: null,
        mode: null,
        delayed: null,
        tokenCardId: null,
        takeMulligan: null,
        action: null,
        ability: null,
      },
    ],
  },
});
const snapshot = (data = view()): ServerMessage => ({
  type: 'snapshot',
  wireVersion: 1,
  viewer: { role: 'player', seat: 'p1' },
  view: data,
});
class FakeSocket {
  onopen: WebSocket['onopen'] = null;
  onmessage: WebSocket['onmessage'] = null;
  onclose: WebSocket['onclose'] = null;
  onerror: WebSocket['onerror'] = null;
  sent: string[] = [];
  closed = false;
  failSend = false;
  send(data: string) {
    if (this.failSend) throw new Error('network lost');
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.call(this as unknown as WebSocket, {} as Event);
  }
  receive(message: unknown) {
    this.onmessage?.call(
      this as unknown as WebSocket,
      { data: JSON.stringify(message) } as MessageEvent,
    );
  }
  disconnect(code = 1006) {
    this.onclose?.call(this as unknown as WebSocket, { code } as CloseEvent);
  }
}
function harness(
  ticket?: (signal: AbortSignal) => Promise<{ ticket: string; gameId: string }>,
  replay = false,
) {
  const sockets: FakeSocket[] = [],
    timers = new Map<() => void, number>();
  let tickets = 0,
    commands = 0;
  const client = new CrossfireConnection(
    'game-browser',
    'player',
    {
      ticket: async signal => {
        tickets++;
        return ticket ? ticket(signal) : { ticket: 'a'.repeat(43), gameId: 'game-browser' };
      },
      socket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: (callback, ms) => {
        timers.set(callback, ms);
        return () => {
          timers.delete(callback);
        };
      },
      commandId: () => `00000000-0000-4000-8000-${String(++commands).padStart(12, '0')}`,
    },
    { replay },
  );
  async function tick() {
    await Promise.resolve();
    await Promise.resolve();
  }
  async function connect() {
    client.start();
    await tick();
    sockets.at(-1)!.open();
    sockets.at(-1)!.receive(snapshot());
  }
  async function timer() {
    const next = [...timers][0]!;
    expect(next).toBeDefined();
    timers.delete(next[0]);
    next[0]();
    await tick();
    return next[1];
  }
  return { client, sockets, timers, tick, connect, timer, tickets: () => tickets };
}

test('damage allocations preserve repeated handles, enforce per-card caps and retain ordinary selection uniqueness', async () => {
  const fixture = harness();
  await fixture.connect();
  const data = view();
  data.decision!.kind = 'effect';
  data.decision!.options[0]!.kind = 'accept-effect';
  data.decision!.selection = { cards: [h(4), h(5)], min: 3, max: 3 };
  fixture.sockets[0]!.receive(snapshot(data));
  expect(fixture.client.choose(h(3), [h(4), h(4), h(5)])).toBe(false);
  data.decision!.selection.allocation = { limits: { [h(4)]: 1, [h(5)]: 3 } };
  fixture.sockets[0]!.receive(snapshot(data));
  expect(fixture.client.choose(h(3), [h(4), h(4), h(5)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(5), h(5)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(5), h(5), h(5)])).toBe(true);
  expect(JSON.parse(fixture.sockets[0]!.sent.at(-1)!).command.selections).toEqual([
    h(5),
    h(5),
    h(5),
  ]);
  fixture.client.stop();
});

test('Disclose requires the complete aspect multiset and allows an empty decline', async () => {
  const fixture = harness();
  await fixture.connect();
  const data = view();
  data.decision!.kind = 'effect';
  data.decision!.effect = 'disclose';
  data.decision!.options[0]!.kind = 'accept-effect';
  data.decision!.options.push({ ...data.decision!.options[0]!, id: h(8), kind: 'decline-effect' });
  data.decision!.selection = {
    cards: [h(4), h(5), h(6)],
    min: 0,
    max: 3,
    disclose: {
      required: ['Aggression', 'Aggression', 'Villainy'],
      icons: {
        [h(4)]: ['Aggression', 'Villainy'],
        [h(5)]: ['Aggression'],
        [h(6)]: ['Command'],
      },
    },
  };
  fixture.sockets[0]!.receive(snapshot(data));
  expect(fixture.client.choose(h(3))).toBe(false);
  expect(fixture.client.choose(h(3), [h(4), h(6)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(4), h(4)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(4), h(5), h(9)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(4), h(5), h(6)])).toBe(true);
  const sent = JSON.parse(fixture.sockets[0]!.sent.at(-1)!);
  expect(sent.command.selections).toEqual([h(4), h(5), h(6)]);
  fixture.sockets[0]!.receive({ type: 'ack', commandId: sent.commandId, duplicate: false });
  expect(fixture.client.choose(h(8), [h(4)])).toBe(false);
  expect(fixture.client.choose(h(8))).toBe(true);
  expect(JSON.parse(fixture.sockets[0]!.sent.at(-1)!).command.selections).toEqual([]);
  fixture.client.stop();
});

test('lost-response reconnect retries exactly the original command after new opaque handles arrive', async () => {
  const h = harness();
  await h.connect();
  expect(h.client.choose(view().decision!.options[0]!.id)).toBe(true);
  const original = h.sockets[0]!.sent.at(-1)!;
  expect(h.client.choose(view().decision!.options[0]!.id)).toBe(false);
  h.sockets[0]!.disconnect();
  expect(h.client.store.state.view).toBeNull();
  expect(await h.timer()).toBe(1000);
  const socket = h.sockets[1]!;
  socket.open();
  socket.receive(snapshot(view('f'.repeat(32))));
  expect(socket.sent.at(-1)).toBe(original);
  expect(h.client.store.state.pending).toBe(true);
  socket.receive({ type: 'ack', commandId: JSON.parse(original).commandId, duplicate: true });
  expect(h.client.store.state.pending).toBe(false);
  expect(h.tickets()).toBe(2);
  h.client.stop();
  expect(h.timers.size).toBe(0);
});

test('gaps request one snapshot and conceal obsolete views until it arrives', async () => {
  const h = harness();
  await h.connect();
  const socket = h.sockets[0]!;
  const delta = {
    type: 'delta',
    wireVersion: 1,
    delta: {
      protocolVersion: PROTOCOL_VERSION,
      gameId: 'game-browser',
      epoch: view().epoch,
      fromRevision: 7,
      revision: 8,
    },
  };
  socket.receive(delta);
  socket.receive(delta);
  expect(socket.sent.filter(m => JSON.parse(m).type === 'resync')).toHaveLength(1);
  expect(h.client.store.state.view).toBeNull();
  socket.receive(snapshot(view('e'.repeat(32))));
  expect(h.client.store.state.status).toBe('connected');
  h.client.stop();
});

test('hand preference replaces the view and access revocation clears it without retry', async () => {
  const h = harness();
  await h.connect();
  h.client.showHands(false);
  expect(h.client.store.state.view).toBeNull();
  expect(h.client.store.state.showRevealedHands).toBe(false);
  h.sockets[0]!.receive(snapshot());
  h.sockets[0]!.disconnect(4409);
  expect(h.client.store.state.status).toBe('stopped');
  expect(h.client.store.state.view).toBeNull();
  expect(h.timers.size).toBe(0);
});

test('cleanup aborts late ticket results and ignores messages from replaced connections', async () => {
  const pending = Promise.withResolvers<{ ticket: string; gameId: string }>();
  let signal: AbortSignal | undefined;
  const h = harness(async current => {
    signal = current;
    return pending.promise;
  });
  h.client.start();
  h.client.stop();
  expect(signal!.aborted).toBe(true);
  pending.resolve({ ticket: 'a'.repeat(43), gameId: 'game-browser' });
  await h.tick();
  expect(h.sockets).toHaveLength(0);
  expect(h.timers.size).toBe(0);
  const next = harness();
  await next.connect();
  const oldHandler = next.sockets[0]!.onmessage;
  next.client.reconnect();
  await next.tick();
  oldHandler?.call(
    next.sockets[0] as unknown as WebSocket,
    { data: JSON.stringify(snapshot()) } as MessageEvent,
  );
  expect(next.client.store.state.view).toBeNull();
  next.client.stop();
});

test('retry backoff is bounded even when a server repeatedly connects then closes', async () => {
  const h = harness();
  await h.connect();
  for (const delay of [1000, 2000, 4000, 8000, 10_000]) {
    h.sockets.at(-1)!.disconnect();
    expect(await h.timer()).toBe(delay);
    h.sockets.at(-1)!.open();
    h.sockets.at(-1)!.receive(snapshot());
  }
  h.sockets.at(-1)!.disconnect();
  expect(h.client.store.state.status).toBe('stopped');
  expect(h.timers.size).toBe(0);
});

test('malformed or wrong-scope updates halt; a send failure schedules an actual reconnect', async () => {
  for (const invalid of [
    { ...snapshot(), privateState: {} },
    snapshot({ ...view(), gameId: 'another' }),
    { type: 'snapshot', wireVersion: 100 },
  ]) {
    const h = harness();
    await h.connect();
    h.sockets[0]!.receive(invalid);
    expect(h.client.store.state.status).toBe('stopped');
    expect(h.timers.size).toBe(0);
  }
  const h = harness();
  await h.connect();
  h.sockets[0]!.failSend = true;
  h.client.choose(view().decision!.options[0]!.id);
  expect(await h.timer()).toBe(1000);
  expect(h.sockets).toHaveLength(2);
  h.client.stop();
});

test('an optional divided-damage effect can be declined with no allocation', async () => {
  const fixture = harness();
  await fixture.connect();
  const data = view();
  data.decision!.kind = 'effect';
  data.decision!.effect = 'allocate-damage';
  data.decision!.options[0]!.kind = 'decline-effect';
  data.decision!.selection = {
    cards: [h(4)],
    min: 4,
    max: 4,
    allocation: { limits: { [h(4)]: 4 } },
  };
  fixture.sockets[0]!.receive(snapshot(data));
  expect(fixture.client.choose(h(3), [h(4)])).toBe(false);
  expect(fixture.client.choose(h(3), [])).toBe(true);
  expect(JSON.parse(fixture.sockets[0]!.sent.at(-1)!).command.selections).toEqual([]);
  fixture.client.stop();
});

test('card names are required only for naming and retries keep the exact public catalog choice', async () => {
  const fixture = harness();
  await fixture.connect();
  expect(fixture.client.choose(h(3), [], 'battlefield-marine')).toBe(false);
  const data = view();
  data.decision!.effect = 'name-card';
  data.decision!.kind = 'effect';
  data.decision!.options[0]!.kind = 'accept-effect';
  data.decision!.selection = null;
  fixture.sockets[0]!.receive(snapshot(data));
  expect(fixture.client.choose(h(3))).toBe(false);
  expect(fixture.client.choose(h(3), [], 'no-glory--only-results')).toBe(true);
  const original = fixture.sockets[0]!.sent.at(-1)!;
  expect(JSON.parse(original).command.namedCardId).toBe('no-glory--only-results');
  fixture.sockets[0]!.disconnect();
  await fixture.timer();
  fixture.sockets[1]!.open();
  fixture.sockets[1]!.receive(snapshot(view('f'.repeat(32))));
  expect(fixture.sockets[1]!.sent.at(-1)).toBe(original);
  fixture.client.stop();
});

test('damage packet choices reject odd allocations before sending and preserve valid repeated handles', async () => {
  const fixture = harness();
  await fixture.connect();
  const data = view();
  data.decision!.kind = 'effect';
  data.decision!.effect = 'allocate-damage';
  data.decision!.options[0]!.kind = 'accept-effect';
  data.decision!.selection = {
    cards: [h(4)],
    min: 0,
    max: 4,
    allocation: { limits: { [h(4)]: 4 }, quantum: 2 },
  };
  fixture.sockets[0]!.receive(snapshot(data));
  expect(fixture.client.choose(h(3), [h(4)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(4), h(4), h(4)])).toBe(false);
  expect(fixture.client.choose(h(3), [h(4), h(4)])).toBe(true);
  expect(JSON.parse(fixture.sockets[0]!.sent.at(-1)!).command.selections).toEqual([h(4), h(4)]);
  fixture.client.stop();
});

test('number choices reject invalid values and preserve zero across a dropped acknowledgment', async () => {
  const fixture = harness();
  await fixture.connect();
  expect(fixture.client.choose(h(3), [], undefined, 0)).toBe(false);
  const data = view();
  data.decision!.effect = 'choose-number';
  data.decision!.kind = 'effect';
  data.decision!.options[0]!.kind = 'accept-effect';
  data.decision!.selection = null;
  fixture.sockets[0]!.receive(snapshot(data));
  for (const n of [undefined, -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
    expect(fixture.client.choose(h(3), [], undefined, n)).toBe(false);
  expect(fixture.client.choose(h(3), [], undefined, 0)).toBe(true);
  const original = fixture.sockets[0]!.sent.at(-1)!;
  expect(JSON.parse(original).command.chosenNumber).toBe(0);
  fixture.sockets[0]!.disconnect();
  await fixture.timer();
  fixture.sockets[1]!.open();
  fixture.sockets[1]!.receive(snapshot(view('f'.repeat(32))));
  expect(fixture.sockets[1]!.sent.at(-1)).toBe(original);
  fixture.client.stop();
});

const replayPosition = (n: number) => ({
  position: h(100 + n),
  branch: h(99),
  branches: [{ id: h(99), label: 'Active line' }],
  steps: {
    previous: n ? h(99 + n) : null,
    next: h(101 + n),
    backFive: h(100),
    forwardFive: h(110),
  },
  progress: n / 10,
  atStart: n === 0,
  atEnd: n === 10,
  live: true,
});
const replayMessage = (
  n: number,
  requestId: string | null = null,
  data = view(),
): ServerMessage => ({
  type: 'replay',
  wireVersion: 1,
  requestId,
  perspective: 'own',
  viewer: { role: 'player', seat: 'p1' },
  position: replayPosition(n),
  update: { type: 'snapshot', view: data },
});
async function replayHarness() {
  const f = harness(undefined, true);
  f.client.start();
  await f.tick();
  const socket = f.sockets[0]!;
  socket.open();
  socket.receive(replayMessage(0));
  const seekId = () => JSON.parse(socket.sent.at(-1)!).requestId as string;
  return { ...f, socket, seekId };
}
test('rapid replay seeks consume obsolete transport deltas without replacing the requested position', async () => {
  const f = await replayHarness();
  expect(f.client.choose(h(3))).toBe(false);
  f.client.seek({ kind: 'position', position: h(101) });
  const old = f.seekId();
  f.client.seek({ kind: 'position', position: h(102) });
  const current = f.seekId();
  f.socket.receive(replayMessage(1, old, { ...view(), revision: 1, round: 2 }));
  expect(f.client.store.state.replay?.position).toBe(h(100));
  f.socket.receive({
    ...replayMessage(2, current),
    update: {
      type: 'delta',
      delta: {
        protocolVersion: PROTOCOL_VERSION,
        gameId: 'game-browser',
        epoch: h(1),
        fromRevision: 1,
        revision: 2,
        modules: { round: 3 },
      },
    },
  });
  expect(f.client.store.state.view?.round).toBe(3);
  expect(f.client.store.state.replay?.position).toBe(h(102));
  expect(f.client.store.state.pending).toBe(false);
  f.client.stop();
});
test('nearby replay views appear immediately, but permission epochs clear that buffer and reconnect resumes exactly', async () => {
  const f = await replayHarness();
  f.client.seek({ kind: 'step', offset: 1 });
  f.socket.receive(replayMessage(1, f.seekId(), { ...view(), revision: 1, round: 2 }));
  f.client.seek({ kind: 'step', offset: -1 });
  expect(f.client.store.state.view?.round).toBe(1);
  expect(f.client.store.state.pending).toBe(true);
  f.socket.receive(replayMessage(0, f.seekId(), view(h(9))));
  f.client.seek({ kind: 'step', offset: 1 });
  expect(f.client.store.state.view?.round).toBe(1); // old permitted position was invalidated
  f.socket.receive(replayMessage(1, f.seekId(), { ...view(h(9)), revision: 1, round: 4 }));
  f.socket.disconnect();
  await f.timer();
  const next = f.sockets[1]!;
  next.open();
  next.receive(replayMessage(0, null, view(h(10))));
  expect(JSON.parse(next.sent.at(-1)!)).toMatchObject({
    type: 'replay-seek',
    seek: { kind: 'position', position: h(101), branch: h(99) },
  });
  next.disconnect(4403);
  expect(f.client.store.state.view).toBeNull();
  expect(f.client.store.state.replay).toBeNull();
  f.client.stop();
});

test('chat retry uses its durable identity, catch-up acknowledges it, and revocation clears private messages', async () => {
  const f = harness();
  await f.connect();
  const first = f.sockets[0]!;
  expect(f.client.sendChat('Before catch-up')).toBe(false);
  first.receive({ type: 'chat', gameId: 'game-browser', replace: true, messages: [] });
  expect(f.client.sendChat('Hello')).toBe(true);
  const original = first.sent.at(-1)!,
    request = JSON.parse(original);
  first.disconnect();
  expect(f.client.store.state.chat).toEqual([]);
  await f.timer();
  const second = f.sockets[1]!;
  second.open();
  second.receive(snapshot());
  second.receive({ type: 'chat', gameId: 'game-browser', replace: true, messages: [] });
  expect(second.sent.at(-1)).toBe(original);
  const entry = {
    id: request.id,
    sequence: 1,
    seat: 'p1',
    text: 'Hello',
    createdAt: '2026-09-13T12:00:00.000Z',
  };
  second.receive({ type: 'chat', gameId: 'game-browser', replace: false, messages: [entry] });
  second.receive({ type: 'chat', gameId: 'game-browser', replace: false, messages: [entry] });
  expect(f.client.store.state.chat).toHaveLength(1);
  expect(f.client.store.state.chatPending).toBe(false);
  second.disconnect(4403);
  expect(f.client.store.state.chat).toEqual([]);
  expect(f.timers.size).toBe(0);
  f.client.stop();
});

test('incompatible and closed games explain why reconnect cannot resume them', async () => {
  for (const [message, status] of [
    ['incompatible', 409],
    ['closed', 403],
  ] as const) {
    const h = harness(async () => {
      throw Object.assign(new Error(message), { status });
    });
    h.client.start();
    await h.tick();
    expect(h.client.store.state.status).toBe('stopped');
    expect(h.client.store.state.unavailableReason).toBe(message);
    expect(h.client.store.state.notice).toContain(
      message === 'incompatible' ? 'older Crossfire version' : 'has been closed',
    );
    expect(h.timers.size).toBe(0);
    h.client.stop();
  }
});
test('concession retries the same receipt after reconnect and works without a turn decision', async () => {
  const h = harness();
  await h.connect();
  h.sockets[0]!.receive(snapshot({ ...view(), revision: 9, decision: null }));
  h.client.concede();
  const sent = h.sockets[0]!.sent.at(-1)!;
  expect(JSON.parse(sent)).toEqual({
    type: 'concede',
    commandId: '00000000-0000-4000-8000-000000000001',
  });
  h.sockets[0]!.disconnect();
  await h.timer();
  const socket = h.sockets[1]!;
  socket.open();
  socket.receive(snapshot(view('f'.repeat(32))));
  expect(socket.sent.at(-1)).toBe(sent);
  socket.receive({ type: 'ack', commandId: JSON.parse(sent).commandId, duplicate: true });
  expect(h.client.store.state.pending).toBe(false);
  h.client.stop();
});
