import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { instance, move } from '../engine/state.ts';
import type { GameState } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

function fixture() {
  const p = position('delayed-position');
  p.players[0].hand = [
    { card: 'sneak-attack', ref: 'event' },
    { card: ids.marine, ref: 'cheap' },
    { card: ids.consular, ref: 'expensive' },
    { card: 'academy-training', ref: 'upgrade' },
  ];
  // Four pay for Sneak Attack (including its missing Cunning aspect).
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  return p;
}
function play(state: GameState, card: string) {
  return advance(
    state,
    choose(state, i => i.kind === 'play' && i.card === card),
  ).state;
}
function pass(state: GameState) {
  return advance(state, choose(state, 'pass')).state;
}
function resume(state: GameState, input: unknown) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  return JSON.parse(child.stdout.toString()).state;
}
function orderingFixture() {
  const p = position('delayed-order');
  p.initiative.holder = 'bob';
  p.delayed = [];
  for (const player of p.players) {
    player.discard = [{ card: 'sneak-attack', ref: `${player.id}-event` }];
    player.ground = [1, 2, 3].map(n => ({ card: ids.marine, ref: `${player.id}-${n}` }));
    for (const n of [1, 2, 3])
      p.delayed.push({ source: `${player.id}-event`, unit: `${player.id}-${n}` });
  }
  return p;
}

test('Sneak Attack pays separately, reduces the aspect-adjusted unit cost to a minimum of zero, and enters ready', () => {
  const { state: initial, refs } = scenario(fixture());
  const pending = play(initial, refs.event!);
  expect(instance(pending, refs.event!).zone).toBe('discard');
  expect(pending.execution.decision?.playerId).toBe('alice');
  expect(pending.execution.decision?.options.map(o => o.intent)).toEqual([
    { kind: 'play', card: refs.cheap! },
    { kind: 'decline-effect' },
  ]);
  const declined = advance(pending, choose(pending, 'decline-effect')).state;
  expect(instance(declined, refs.cheap!).zone).toBe('hand');
  expect(declined.delayedEffects).toEqual([]);
  expect(declined.execution.decision?.playerId).toBe('bob');
  const input = choose(pending, 'play');
  const state = advance(pending, input).state;
  expect(resume(pending, input)).toEqual(state);
  expect(state.players.alice!.resources.filter(id => instance(state, id).exhausted)).toHaveLength(
    4,
  );
  expect(instance(state, refs.cheap!)).toMatchObject({ zone: 'ground', exhausted: false });
  expect(state.delayedEffects[0]?.target).toMatchObject({
    instanceId: refs.cheap,
    incarnation: instance(state, refs.cheap!).incarnation,
  });
  expect(state.execution.decision?.playerId).toBe('bob');
  expect(state.facts.filter(f => f.type === 'played').map(f => f.amount)).toEqual([4, 0]);
  const expensive = fixture();
  expensive.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  const b = scenario(expensive);
  const paid = play(play(b.state, b.refs.event!), b.refs.expensive!);
  // Consular: printed four, missing Vigilance adds two, reduction subtracts three = three.
  expect(paid.facts.filter(f => f.type === 'played').map(f => f.amount)).toEqual([4, 3]);
});

test('an ineffective Sneak Attack still costs resources, and nested Shielded resolves before the opponent acts', () => {
  const p = fixture();
  p.players[0].hand = [{ card: 'sneak-attack', ref: 'event' }, { card: 'academy-training' }];
  const a = scenario(p);
  const ineffective = play(a.state, a.refs.event!);
  expect(ineffective.delayedEffects).toEqual([]);
  expect(ineffective.execution.decision?.playerId).toBe('bob');
  p.players[0].hand = [
    { card: 'sneak-attack', ref: 'event' },
    { card: 'imperial-armored-commando', ref: 'unit' },
  ];
  p.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  const b = scenario(p);
  let state = play(play(b.state, b.refs.event!), b.refs.unit!);
  while (state.execution.decision?.kind !== 'action')
    state = advance(state, choose(state, state.execution.decision!.options[0]!.intent.kind)).state;
  expect(state.execution.decision?.playerId).toBe('bob');
  expect(instance(state, b.refs.unit!).exhausted).toBe(false);
  expect(
    Object.values(state.cards).some(
      c => c.cardId === 'shield' && c.attachedTo?.instanceId === b.refs.unit,
    ),
  ).toBe(true);
});

test('regroup defeats the exact unit and its upgrades before draw; its defeat ability survives a fresh process', () => {
  const p = position('delayed-defeat');
  p.players[0].discard = [{ card: 'sneak-attack', ref: 'event' }];
  p.players[0].ground = [{ card: 'superlaser-technician', ref: 'unit' }];
  p.attachments = [
    { card: 'shield', unit: 'unit', ref: 'shield' },
    { card: 'academy-training', unit: 'unit', ref: 'upgrade' },
  ];
  p.delayed = [{ source: 'event', unit: 'unit' }];
  const { state: initial, refs } = scenario(p);
  const state = pass(pass(initial));
  expect(state.phase).toBe('regroup');
  expect(state.execution.decision?.kind).toBe('effect');
  expect(state.players.alice!.deck).toHaveLength(12);
  expect(instance(state, refs.unit!).zone).toBe('discard');
  expect(instance(state, refs.shield!).zone).toBe('set-aside');
  expect(instance(state, refs.upgrade!).zone).toBe('discard');
  const input = choose(state, 'accept-effect');
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(instance(after, refs.unit!).zone).toBe('resources');
  expect(after.players.alice!.deck).toHaveLength(10);
  expect(after.delayedEffects).toEqual([]);
  expect(after.facts.findIndex(f => f.type === 'delayed-resolved')).toBeLessThan(
    after.facts.findIndex(f => f.type === 'drawn'),
  );
});

test('delays survive the source moving; an old target reference cannot defeat a new incarnation', () => {
  const p = position('delayed-reentry');
  p.players[0].discard = [{ card: 'sneak-attack', ref: 'event' }];
  p.players[0].ground = [
    { card: ids.marine, ref: 'old' },
    { card: ids.marine, ref: 'live' },
  ];
  p.delayed = [
    { source: 'event', unit: 'old' },
    { source: 'event', unit: 'live' },
  ];
  const { state, refs } = scenario(p);
  move(state, instance(state, refs.event!), 'deck');
  move(state, instance(state, refs.old!), 'hand');
  move(state, instance(state, refs.old!), 'ground');
  state.execution.decision = null;
  settle(state);
  let regroup = pass(pass(decodeState(encodeState(state))));
  const batch = regroup.execution.frames[0]!;
  if (batch.kind !== 'delayed-batch') throw new Error('Expected delays');
  const first = batch.effects.find(e => e.target!.instanceId === refs.old)!;
  regroup = advance(
    regroup,
    choose(regroup, i => i.kind === 'delayed' && i.effectId === first.id),
  ).state;
  expect(instance(regroup, refs.old!).zone).toBe('ground');
  expect(instance(regroup, refs.live!).zone).toBe('discard');
});

test('modified play suspends for uniqueness with its delay recorded, even if the new copy is defeated', () => {
  const p = fixture();
  p.players[0].hand = [
    { card: 'sneak-attack', ref: 'event' },
    { card: 'greef-karga--affable-commissioner', ref: 'new' },
  ];
  p.players[0].ground = [{ card: 'greef-karga--affable-commissioner', ref: 'old' }];
  const { state: initial, refs } = scenario(p);
  const state = play(play(initial, refs.event!), refs.new!);
  expect(state.execution.decision?.kind).toBe('unique');
  expect(state.delayedEffects[0]!.target!.instanceId).toBe(refs.new!);
  const input = choose(state, i => i.kind === 'keep-unique' && i.card === refs.old);
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(instance(after, refs.new!).zone).toBe('discard');
  expect(after.execution.decision?.kind).toBe('search');
  expect(after.execution.decision?.playerId).toBe('alice');
});

test('initiative holder chooses which player resolves first; each player orders their whole batch', () => {
  const { state: initial, refs } = scenario(orderingFixture());
  const state = pass(pass(initial));
  expect(state.execution.decision).toMatchObject({ kind: 'delayed-player', playerId: 'bob' });
  const input = choose(state, i => i.kind === 'delayed-player' && i.playerId === 'alice');
  let after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(after.execution.decision).toMatchObject({ kind: 'delayed', playerId: 'alice' });
  const batch = after.execution.frames[0]!;
  if (batch.kind !== 'delayed-batch') throw new Error('Expected delays');
  expect(after.execution.decision!.options).toHaveLength(3);
  const second = batch.effects.find(e => e.target!.instanceId === refs['alice-2'])!;
  const next = choose(after, i => i.kind === 'delayed' && i.effectId === second.id);
  const continued = advance(after, next).state;
  expect(resume(after, next)).toEqual(continued);
  after = continued;
  expect(after.execution.decision).toMatchObject({ kind: 'delayed', playerId: 'alice' });
  expect(after.execution.decision!.options).toHaveLength(2);
  expect(instance(after, refs['alice-2']!).zone).toBe('discard');
  after = advance(after, choose(after, 'delayed')).state;
  expect(after.execution.decision).toMatchObject({ kind: 'delayed', playerId: 'bob' });
  expect(after.players.alice!.deck).toHaveLength(12);
  expect(after.ground).toHaveLength(3);
  after = advance(after, choose(after, 'delayed')).state;
  after = advance(after, choose(after, 'delayed')).state;
  expect(after.ground).toEqual([]);
  expect(after.execution.decision?.kind).toBe('resource');
});

test('future-round delays remain scheduled; malformed sources, timing and duplicate IDs cannot be restored', () => {
  const p = orderingFixture();
  p.delayed![0]!.round = 2;
  const { state: initial } = scenario(p);
  const next = pass(pass(initial));
  expect(next.delayedEffects).toHaveLength(1);
  expect(decodeState(encodeState(next))).toEqual(next);
  for (const change of [
    (s: GameState) => {
      s.delayedEffects[0]!.source.cardId = ids.marine;
    },
    (s: GameState) => {
      s.delayedEffects[0]!.dueRound = 0;
    },
    (s: GameState) => {
      s.delayedEffects.push(structuredClone(s.delayedEffects[0]!));
    },
    (s: GameState) => {
      s.delayedEffects[0]!.target!.instanceId = s.players.alice!.base;
    },
  ]) {
    const altered = structuredClone(initial);
    change(altered);
    expect(() => decodeState(encodeState(altered))).toThrow();
  }
  const bad = structuredClone(next);
  const frame = bad.execution.frames[0]!;
  if (frame.kind !== 'delayed-batch') throw new Error('Expected delays');
  frame.effects[0]!.dueRound++;
  expect(() => decodeState(encodeState(bad))).toThrow('Invalid delayed timing');
});

test('scheduled effects and order choices use opaque exact-copy links, never hidden current-card tracking', () => {
  const { state: initial, refs } = scenario(orderingFixture());
  const player = new Projector(initial.gameId, { role: 'player', playerId: 'bob' });
  const state = pass(pass(initial));
  let view = player.project(state);
  expect(view.scheduled).toHaveLength(6);
  expect(view.scheduled[0]!.target!.currentCardId).toBe(
    view.cards.find(c => c.id === view.scheduled[0]!.target!.currentCardId)!.id,
  );
  for (const effect of initial.delayedEffects)
    expect(view.scheduled.some(e => e.id === effect.id)).toBe(false);
  const option = view.decision!.options.find(o => o.playerId === 'bob')!;
  const after = advance(
    state,
    player.command(state, {
      gameId: state.gameId,
      epoch: view.epoch,
      expectedRevision: view.revision,
      decisionId: view.decision!.id,
      optionId: option.id,
      selections: [],
    }),
  ).state;
  view = player.project(after);
  expect(view.decision!.options.every(o => o.delayed?.target!.currentCardId !== null)).toBe(true);
  const secret = structuredClone(initial);
  move(secret, instance(secret, refs['alice-1']!), 'hand');
  const spectator = new Projector(secret.gameId, { role: 'spectator' }).project(secret);
  expect(spectator.scheduled[0]!.target).toMatchObject({ cardId: ids.marine, currentCardId: null });
  const different = orderingFixture();
  different.players[0].deck![0]!.card = ids.fighter;
  const hidden = scenario(different).state;
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const key = 'd'.repeat(32);
    expect(new Projector(initial.gameId, viewer, key).project(initial)).toEqual(
      new Projector(hidden.gameId, viewer, key).project(hidden),
    );
  }
});

test('a recorded game replays each accepted input through modified play and delayed defeat', () => {
  const c = config('delayed-recording');
  for (const player of c.players)
    player.deck = [
      { cardId: ids.marine, quantity: 12 },
      { cardId: 'sneak-attack', quantity: 12 },
    ];
  const game = new LocalGame(c, upper => upper - 1);
  let state = setup(game);
  for (let n = 0; n < 150 && !state.result; n++) {
    const d = state.execution.decision!;
    const option =
      d.options.find(
        o => o.intent.kind === 'play' && instance(state, o.intent.card).cardId === 'sneak-attack',
      ) ??
      (d.kind === 'effect' ? d.options.find(o => o.intent.kind === 'play') : undefined) ??
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options[0]!;
    state = game.submit(
      choose(
        state,
        i => i === option.intent,
        d.selection ? d.selection.cards.slice(0, d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect(state.facts.some(f => f.type === 'delayed-scheduled')).toBe(true);
  expect(state.facts.some(f => f.type === 'delayed-resolved')).toBe(true);
});
