import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
import { move } from '../engine/state.ts';
import { gameViewSchema, applyViewDelta, diffViews } from '../view/types.ts';
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
const eye = 'the-eye-of-aldhani';
function board(copies = 1) {
  const p = position();
  p.players[0].hand = Array.from({ length: copies }, (_, i) => ({ card: eye, ref: `eye${i}` }));
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[1].resources = [{ card: ids.marine, ref: 'resource' }];
  return p;
}
function nextAction(s: GameState) {
  s = step(step(s, 'pass'), 'pass');
  expect(s.phase).toBe('regroup');
  s = step(step(s, 'resource'), 'resource');
  expect(s.phase).toBe('action');
  return s;
}
test('Eye waits through regroup and readying, then the opponent chooses payments before all other units exhaust', () => {
  const s = scenario(board()),
    scheduled = step(s.state, 'play');
  expect(scheduled.cards[s.refs.ground!]!.exhausted).toBe(false);
  expect(scheduled.delayedEffects[0]).toMatchObject({
    kind: 'effects-at-action',
    target: null,
    dueRound: 2,
  });
  resume(scheduled, choose(scheduled, 'pass'));
  const tax = nextAction(scheduled);
  expect(tax.execution.decision!.playerId).toBe('bob');
  expect(tax.execution.decision!.selection).toEqual({
    cards: [s.refs.ground!, s.refs.space!],
    min: 0,
    max: 1,
  });
  expect(tax.cards[s.refs.resource!]!.exhausted).toBe(false);
  resume(tax, choose(tax, 'accept-effect', [s.refs.space!]));
  const done = step(tax, 'accept-effect', [s.refs.space!]);
  expect(done.cards[s.refs.resource!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.ground!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.space!]!.exhausted).toBe(false);
  expect(done.cards[s.refs.friendly!]!.exhausted).toBe(false);
  expect(done.execution.decision!.playerId).toBe('alice');
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.delayedEffects).toEqual([]);
  expect(nextAction(done).execution.decision!.kind).toBe('action');
});
test('paying none exhausts all units; excess, duplicate, foreign and forged-payer submissions fail', () => {
  const s = scenario(board()),
    tax = nextAction(step(s.state, 'play'));
  for (const selected of [
    [s.refs.ground!, s.refs.space!],
    [s.refs.ground!, s.refs.ground!],
    [s.refs.friendly!],
  ])
    expect(() => step(tax, 'accept-effect', selected)).toThrow();
  expect(() => advance(tax, { ...choose(tax, 'accept-effect'), playerId: 'alice' })).toThrow();
  const done = step(tax, 'accept-effect');
  expect(done.cards[s.refs.ground!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.space!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.resource!]!.exhausted).toBe(false);
});
test('Credit choices preserve all unit decisions and apply no exhaustion before payment is complete', () => {
  const p = board();
  p.players[1].credits = ['credit'];
  const s = scenario(p),
    tax = nextAction(step(s.state, 'play'));
  expect(tax.execution.decision!.selection!.max).toBe(2);
  const payment = step(tax, 'accept-effect', [s.refs.ground!, s.refs.space!]);
  expect(payment.execution.frames[0]!.kind).toBe('credit-payment');
  expect(payment.cards[s.refs.ground!]!.exhausted).toBe(false);
  expect(payment.cards[s.refs.resource!]!.exhausted).toBe(false);
  const credit = payment.execution.decision!.selection!.cards[0]!;
  resume(payment, choose(payment, 'accept-effect', [credit]));
  const done = step(payment, 'accept-effect', [credit]);
  expect(done.cards[credit]!.zone).toBe('set-aside');
  expect(done.cards[s.refs.resource!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.ground!]!.exhausted).toBe(false);
  expect(done.cards[s.refs.space!]!.exhausted).toBe(false);
  const bad = structuredClone(payment);
  const f = bad.execution.frames[0];
  if (f?.kind !== 'credit-payment') throw new Error('Missing payment');
  f.selections = [s.refs.friendly!];
  f.amount = 1;
  expect(() => decodeState(encodeState(bad))).toThrow();
});
test('the delayed effect finds units at resolution, includes deployed leaders and excludes Pilots and captives', () => {
  const p = board();
  p.players[1].leader = {
    card: ids.leader,
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
    ref: 'leader',
  };
  p.players[1].hand = [{ card: ids.fighter, ref: 'new' }];
  p.players[1].resources = Array.from({ length: 3 }, () => ({ card: ids.marine }));
  p.attachments = [{ card: 'academy-graduate', unit: 'space', owner: 'bob', ref: 'pilot' }];
  p.players[0].base.ref = 'base';
  p.captured = [{ card: ids.marine, owner: 'bob', guard: 'base', ref: 'captive' }];
  const s = scenario(p),
    played = step(step(s.state, 'play'), 'play'),
    tax = nextAction(played);
  expect(tax.execution.decision!.selection!.cards).toEqual([
    s.refs.leader!,
    s.refs.ground!,
    s.refs.space!,
    s.refs.new!,
  ]);
  expect(tax.execution.decision!.selection!.max).toBe(3);
  const done = step(tax, 'accept-effect');
  expect(done.cards[s.refs.leader!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.pilot!]!.exhausted).toBe(false);
  expect(done.cards[s.refs.captive!]!.zone).toBe('captured');
});
test('multiple Eye copies are ordered and each independently demands payment even for already exhausted units', () => {
  const s = scenario(board(2));
  let state = step(s.state, 'play');
  state = step(step(state, 'pass'), 'play');
  const batch = nextAction(state);
  expect(batch.execution.frames[0]!.kind).toBe('delayed-batch');
  resume(batch, choose(batch, 'delayed'));
  const first = step(batch, 'delayed');
  const second = step(first, 'accept-effect');
  expect(second.execution.frames[0]!.kind).toBe('unit-tax');
  expect(second.cards[s.refs.ground!]!.exhausted).toBe(true);
  resume(second, choose(second, 'accept-effect', [s.refs.ground!]));
  const done = step(second, 'accept-effect', [s.refs.ground!]);
  expect(done.cards[s.refs.ground!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.resource!]!.exhausted).toBe(true);
});
test('an empty enemy board needs no choice and a departed event still schedules the next phase', () => {
  const p = board();
  p.players[1].ground = [];
  p.players[1].space = [];
  const s = scenario(p),
    state = step(s.state, 'play');
  move(state, state.cards[s.refs.eye0!]!, 'hand');
  const done = nextAction(state);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.cards[s.refs.resource!]!.exhausted).toBe(false);
});
test('public schedules and private payment decisions remain valid across modular deltas and hidden-resource changes', () => {
  const s = scenario(board()),
    scheduled = step(s.state, 'play'),
    tax = nextAction(scheduled);
  for (const viewer of [
    { role: 'player', playerId: 'alice' } as const,
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const p = new Projector(tax.gameId, viewer, 'k'.repeat(32)),
      before = p.project(scheduled),
      after = p.project(tax);
    expect(before.scheduled[0]!.target).toBeNull();
    expect(gameViewSchema.parse(after)).toEqual(after);
    expect(applyViewDelta(before, diffViews(before, after)!)).toEqual(after);
    expect(after.decision !== null).toBe(viewer.role === 'player' && viewer.playerId === 'bob');
    if (viewer.role !== 'player' || viewer.playerId !== 'bob') {
      const hidden = structuredClone(tax);
      hidden.cards[s.refs.resource!]!.cardId = ids.consular;
      expect(p.project(hidden)).toEqual(after);
    }
  }
});
test('checkpoints reject rewritten delayed effects, phase mismatches and changed unit incarnations', () => {
  const s = scenario(board(2)),
    scheduled = step(s.state, 'play');
  const bad = structuredClone(scheduled),
    delay = bad.delayedEffects[0];
  if (delay?.kind !== 'effects-at-action') throw new Error('Missing schedule');
  delay.effects = [];
  expect(() => decodeState(encodeState(bad))).toThrow();
  const tax = nextAction(scheduled),
    badTax = structuredClone(tax),
    frame = badTax.execution.frames[0];
  if (frame?.kind !== 'unit-tax') throw new Error('Missing tax');
  frame.cards[0]!.incarnation++;
  expect(() => decodeState(encodeState(badTax))).toThrow();
  let state = step(step(scheduled, 'pass'), 'play');
  state = nextAction(state);
  const wrong = structuredClone(state);
  wrong.phase = 'regroup';
  expect(() => decodeState(encodeState(wrong))).toThrow();
});
