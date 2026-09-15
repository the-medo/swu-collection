import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { choose, config, ids } from './helpers.ts';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
function game(both = false) {
  const c = config();
  c.players[0].deck = [ids.marine, ids.fighter, ids.trooper, ids.consular, ids.racer].map(
    cardId => ({ cardId, quantity: 4 }),
  );
  c.players[0].base = 'nabat-village';
  if (both) c.players[1].base = 'nabat-village';
  return new LocalGame(c, n => n - 1);
}
function firstPhase(first = 'alice', both = false) {
  const g = game(both);
  let s = g.submit(choose(g.state, i => i.kind === 'initiative' && i.playerId === first));
  for (let n = 0; n < 2; n++) s = g.submit(choose(s, i => i.kind === 'mulligan' && !i.take));
  for (let n = 0; n < 2; n++)
    s = g.submit(choose(s, 'resource', s.execution.decision!.selection!.cards.slice(0, 2)));
  return { game: g, state: s };
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
test('Nabat draws nine starting cards and denies its mulligan while the opponent retains the usual choice', () => {
  const g = game();
  let s = g.submit(choose(g.state, i => i.kind === 'initiative' && i.playerId === 'alice'));
  expect(s.players.alice!.hand).toHaveLength(9);
  expect(s.players.bob!.hand).toHaveLength(6);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'mulligan', take: false },
  ]);
  expect(() => choose(s, i => i.kind === 'mulligan' && i.take)).toThrow();
  s = g.submit(choose(s, 'mulligan'));
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'mulligan', take: false },
    { kind: 'mulligan', take: true },
  ]);
  s = g.submit(choose(s, i => i.kind === 'mulligan' && i.take));
  expect(s.players.alice!.hand).toHaveLength(9);
  expect(s.players.bob!.hand).toHaveLength(6);
});
test('Nabat resolves after initial resourcing and before either initiative player takes an action', () => {
  for (const first of ['alice', 'bob']) {
    const { state: s } = firstPhase(first);
    expect(s.phase).toBe('action');
    expect(s.round).toBe(1);
    expect(s.activePlayer).toBe(first);
    expect(s.players.alice!.hand).toHaveLength(7);
    expect(s.players.alice!.resources).toHaveLength(2);
    expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
    expect(s.execution.frames[0]!.kind).toBe('zone-inspection');
    expect(s.execution.decision!.playerId).toBe('alice');
    expect(s.execution.decision!.selection).toEqual({
      cards: s.players.alice!.hand,
      min: 3,
      max: 3,
    });
  }
});
test('Nabat requires three distinct hand cards and orders them privately with top-of-group selected first', () => {
  const { state: s } = firstPhase(),
    selected = s.players.alice!.hand.slice(1, 4),
    before = [...s.players.alice!.deck];
  expect(() => step(s, 'accept-effect', selected.slice(0, 2))).toThrow();
  expect(() => step(s, 'accept-effect', [selected[0]!, selected[0]!, selected[1]!])).toThrow();
  resume(s, choose(s, 'accept-effect', selected));
  const order = step(s, 'accept-effect', selected);
  expect(order.players.alice!.deck).toEqual(before);
  expect(order.players.alice!.hand).toHaveLength(7);
  expect(
    new Projector(order.gameId, { role: 'player', playerId: 'alice' }, 'v'.repeat(32)).project(
      order,
    ).decision!.effect,
  ).toBe('order-bottom-of-deck');
  resume(
    order,
    choose(order, i => i.kind === 'target' && i.card === selected[2]),
  );
  const second = step(order, i => i.kind === 'target' && i.card === selected[2]);
  resume(
    second,
    choose(second, i => i.kind === 'target' && i.card === selected[0]),
  );
  const done = step(second, i => i.kind === 'target' && i.card === selected[0]);
  expect(done.players.alice!.deck).toEqual([...before, selected[2]!, selected[0]!, selected[1]!]);
  expect(done.players.alice!.hand).toHaveLength(4);
  expect(done.execution.decision!.kind).toBe('action');
  for (const id of selected) expect(done.cards[id]!.visibility).toBe(s.cards[id]!.visibility + 1);
});
test('Nabat’s chosen hand cards and their bottom order cannot be distinguished by the opponent or spectator', () => {
  const { state: s } = firstPhase(),
    selected = s.players.alice!.hand.slice(0, 3),
    pending = step(s, 'accept-effect', selected);
  const a = step(
    step(pending, i => i.kind === 'target' && i.card === selected[0]),
    i => i.kind === 'target' && i.card === selected[1],
  );
  const b = step(
    step(pending, i => i.kind === 'target' && i.card === selected[2]),
    i => i.kind === 'target' && i.card === selected[1],
  );
  for (const viewer of [
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    expect(new Projector(a.gameId, viewer, 'v'.repeat(32)).project(a)).toEqual(
      new Projector(b.gameId, viewer, 'v'.repeat(32)).project(b),
    );
  }
});
test('hand-bottom checkpoints reject another player’s hand, a duplicated card, and a forged deck-order mode', () => {
  const { state: s } = firstPhase(),
    selected = s.players.alice!.hand.slice(0, 3),
    pending = step(s, 'accept-effect', selected);
  for (const variant of ['owner', 'duplicate', 'mode']) {
    const bad = structuredClone(pending),
      frame = bad.execution.frames[0]!;
    if (frame.kind !== 'arrange-deck') throw new Error('Missing order');
    if (variant === 'owner') frame.owner = 'bob';
    else if (variant === 'duplicate') frame.cards[1] = frame.cards[0]!;
    else frame.mode = 'bottom-any';
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});
test('both Nabat bases resolve their own ordered hand choices before the first action and do not trigger in later rounds', () => {
  const { game: g } = firstPhase('bob', true);
  let s = g.state;
  const d = s.execution.decision!;
  if (d.options.some(o => o.intent.kind === 'trigger-player'))
    s = g.submit(choose(s, i => i.kind === 'trigger-player' && i.playerId === 'alice'));
  let orders = 0;
  while (s.execution.decision!.kind !== 'action') {
    const d = s.execution.decision!,
      selection = d.selection;
    const option = d.options.find(o => o.intent.kind === 'accept-effect') ?? d.options[0]!;
    s = g.submit(
      choose(
        s,
        i => JSON.stringify(i) === JSON.stringify(option.intent),
        selection ? selection.cards.slice(0, selection.min) : [],
      ),
    );
    if (option.intent.kind === 'accept-effect') orders++;
  }
  expect(orders).toBe(2);
  expect(s.players.alice!.hand).toHaveLength(4);
  expect(s.players.bob!.hand).toHaveLength(4);
  expect(s.activePlayer).toBe('bob');
  s = g.submit(choose(s, 'pass'));
  s = g.submit(choose(s, 'pass'));
  for (let n = 0; n < 2; n++) s = g.submit(choose(s, 'resource', []));
  expect(s.round).toBe(2);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.players.alice!.hand).toHaveLength(6);
  expect(s.players.bob!.hand).toHaveLength(6);
  expect(replay(g.recording)).toEqual(s);
});
