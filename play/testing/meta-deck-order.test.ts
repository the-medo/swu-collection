import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const qui = 'qui-gon-jinn--influencing-chance',
  rogue = 'rogue-one--at-any-cost';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function board(card = qui) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'source' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].deck = [
    { card: ids.marine, ref: 'one' },
    { card: 'incapacitate', ref: 'two' },
    { card: 'academy-training', ref: 'three' },
    ...Array.from({ length: 9 }, () => ({ card: ids.marine })),
  ];
  return p;
}
test('Qui-Gon privately inspects three cards, may discard any one, and explicitly orders the rest on top', () => {
  const s = scenario(board()),
    look = step(s.state, 'play');
  expect(look.execution.decision!.selection).toEqual({
    cards: [s.refs.one!, s.refs.two!, s.refs.three!],
    min: 0,
    max: 1,
  });
  expect(() => step(look, 'accept-effect', [s.refs.one!, s.refs.two!])).toThrow();
  resume(look, choose(look, 'accept-effect', [s.refs.two!]));
  const order = step(look, 'accept-effect', [s.refs.two!]);
  expect(order.cards[s.refs.two!]!.zone).toBe('discard');
  const actor = new Projector(order.gameId, { role: 'player', playerId: 'alice' }).project(order);
  expect(actor.decision!.effect).toBe('order-top-of-deck');
  expect(actor.decision!.inspectedCards).toHaveLength(2);
  resume(
    order,
    choose(order, i => i.kind === 'target' && i.card === s.refs.three),
  );
  const done = target(order, s.refs.three!);
  expect(done.players.alice!.deck.slice(0, 2)).toEqual([s.refs.three!, s.refs.one!]);
  expect(done.players.alice!.deck.slice(2)).toEqual(s.state.players.alice!.deck.slice(3));
  expect(done.execution.random).toBeNull();
  const other = new Projector(done.gameId, { role: 'player', playerId: 'bob' }).project(done);
  expect(other.events.find(e => e.type === 'discarded')!.cards.at(-1)!.cardId).toBe('incapacitate');
});
test('declining to discard retains all three cards and accepts any explicit top order across reloads', () => {
  const s = scenario(board()),
    order = step(step(s.state, 'play'), 'accept-effect');
  resume(
    order,
    choose(order, i => i.kind === 'target' && i.card === s.refs.three),
  );
  const second = target(order, s.refs.three!);
  expect(() => target(second, s.refs.three!)).toThrow();
  resume(
    second,
    choose(second, i => i.kind === 'target' && i.card === s.refs.one),
  );
  const done = target(second, s.refs.one!);
  expect(done.players.alice!.deck.slice(0, 3)).toEqual([s.refs.three!, s.refs.one!, s.refs.two!]);
  expect(done.players.alice!.discard).toEqual([]);
  expect(done.cards[s.refs.one!]!.visibility).toBeGreaterThan(
    s.state.cards[s.refs.one!]!.visibility,
  );
});
test('Qui-Gon also looks on attack before combat, while Sentinel constrains opposing attacks', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].ground = [{ card: qui, ref: 'qui' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    look = step(
      s.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === s.refs.qui &&
        i.defender === s.state.players.bob!.base,
    );
  expect(look.cards[look.players.bob!.base]!.damage).toBe(0);
  const order = step(look, 'accept-effect', [s.refs.one!]),
    done = target(order, s.refs.two!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(
    done.execution.decision!.options.filter(o => o.intent.kind === 'attack').map(o => o.intent),
  ).toEqual([{ kind: 'attack', attacker: s.refs.enemy!, defender: s.refs.qui! }]);
});
test('empty and single-card looks cannot cause fatigue and need no meaningless ordering choices', () => {
  for (const size of [0, 1])
    for (const discard of [false, true]) {
      const p = board();
      p.players[0].deck!.length = size;
      const s = scenario(p),
        look = step(s.state, 'play'),
        done = size ? step(look, 'accept-effect', discard ? [s.refs.one!] : []) : look;
      expect(done.execution.decision!.kind).toBe('action');
      expect(done.cards[done.players.alice!.base]!.damage).toBe(0);
      expect(done.players.alice!.deck).toHaveLength(size && !discard ? 1 : 0);
    }
});
function rogueBoard() {
  const p = board('incapacitate');
  p.players[0].space = [{ card: rogue, ref: 'rogue' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ally', damage: 2 }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy', damage: 2 }];
  return p;
}
test('Rogue One can split two inspected cards between top and bottom, preserving uninspected order', () => {
  const s = scenario(rogueBoard()),
    look = target(step(s.state, 'play'), s.refs.ally!);
  expect(look.execution.frames[0]).toMatchObject({ kind: 'arrange-deck', stage: 'choose-bottom' });
  resume(look, choose(look, 'accept-effect', [s.refs.one!]));
  const done = step(look, 'accept-effect', [s.refs.one!]);
  expect(done.players.alice!.deck).toEqual([
    s.refs.two!,
    ...s.state.players.alice!.deck.slice(2),
    s.refs.one!,
  ]);
  expect(done.players.alice!.hand).toEqual([]);
  expect(done.execution.random).toBeNull();
});
test('Rogue One offers explicit ordering whether both cards stay on top or both go to the bottom', () => {
  for (const bottom of [false, true]) {
    const s = scenario(rogueBoard()),
      look = target(step(s.state, 'play'), s.refs.ally!),
      order = step(look, 'accept-effect', bottom ? [s.refs.one!, s.refs.two!] : []);
    const view = new Projector(order.gameId, { role: 'player', playerId: 'alice' }).project(order);
    expect(view.decision!.effect).toBe(bottom ? 'order-bottom-of-deck' : 'order-top-of-deck');
    resume(
      order,
      choose(order, i => i.kind === 'target' && i.card === s.refs.two),
    );
    const done = target(order, s.refs.two!);
    expect(
      bottom ? done.players.alice!.deck.slice(-2) : done.players.alice!.deck.slice(0, 2),
    ).toEqual([s.refs.two!, s.refs.one!]);
  }
});
test('Rogue One ignores enemy defeats, but its own defeat still permits the look with a departed source', () => {
  const p = rogueBoard();
  p.players[0].space![0]!.damage = 2;
  const s = scenario(p),
    enemy = target(step(s.state, 'play'), s.refs.enemy!);
  expect(enemy.execution.decision!.kind).toBe('action');
  const own = target(step(s.state, 'play'), s.refs.rogue!);
  expect(own.cards[s.refs.rogue!]!.zone).toBe('discard');
  resume(own, choose(own, 'accept-effect', [s.refs.one!]));
  expect(step(own, 'accept-effect', [s.refs.one!]).players.alice!.deck.at(-1)).toBe(s.refs.one!);
});
test('simultaneous friendly defeats each trigger Rogue One, even when it is defeated in that event', () => {
  const p = board('hyperspace-disaster');
  p.players[0].space = [
    { card: rogue, ref: 'rogue' },
    { card: ids.fighter, ref: 'ally' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const s = scenario(p),
    batch = step(s.state, 'play');
  expect(batch.execution.frames[0]!.kind).toBe('trigger-batch');
  expect(batch.execution.decision!.options).toHaveLength(2);
  resume(batch, choose(batch, 'trigger'));
  const first = step(batch, 'trigger'),
    next = step(first, 'accept-effect', [s.refs.one!]);
  expect(next.execution.frames[0]!.kind).toBe('arrange-deck');
  const done = step(next, 'accept-effect', [s.refs.two!]);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.facts.filter(f => f.type === 'looked-at')).toHaveLength(2);
});
test('private inspected identities and order choices are indistinguishable to the opponent and spectators', () => {
  const s = scenario(board()),
    a = step(s.state, 'play'),
    b = structuredClone(a);
  b.cards[s.refs.one!]!.cardId = ids.consular;
  const frame = b.execution.frames[0];
  if (frame?.kind !== 'arrange-deck') throw new Error('Missing look');
  frame.cards[0]!.cardId = ids.consular;
  b.facts.find(f => f.type === 'looked-at')!.cards[0]!.cardId = ids.consular;
  const order = step(a, 'accept-effect'),
    left = target(order, s.refs.one!),
    right = target(order, s.refs.two!);
  for (const viewer of [
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const p = new Projector(a.gameId, viewer, 'k'.repeat(32));
    expect(p.project(a)).toEqual(p.project(b));
    expect(p.project(left)).toEqual(p.project(right));
  }
});
test('checkpoints reject duplicate orders, foreign bottom cards, forged inspections and stage mismatches', () => {
  const s = scenario(board()),
    order = step(step(s.state, 'play'), 'accept-effect');
  for (const badKind of ['duplicate', 'foreign', 'inspection', 'stage']) {
    const bad = structuredClone(order),
      frame = bad.execution.frames[0];
    if (frame?.kind !== 'arrange-deck') throw new Error('Missing order');
    if (badKind === 'duplicate') frame.topOrder = [s.refs.one!, s.refs.one!];
    if (badKind === 'foreign') frame.bottom = [s.refs.source!];
    if (badKind === 'inspection') frame.cards[0]!.incarnation++;
    if (badKind === 'stage') frame.stage = 'choose-bottom';
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});
