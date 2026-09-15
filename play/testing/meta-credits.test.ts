import { createCredits, credits, readyResourceCount } from '../engine/credits.ts';
import { addCard, assertState } from '../engine/state.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { effectiveAbilities, supportOrigins } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = () => Array.from({ length: 12 }, () => ({ card: ids.marine }));
function step(
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) {
  return advance(s, choose(s, i, selections)).state;
}
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function playCard(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
function trigger(s: GameState, id: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === option.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

const play = (s: GameState, card: string) => step(s, i => i.kind === 'play' && i.card === card);
const pay = (s: GameState, ids: string[] = []) => step(s, 'accept-effect', ids);
const arvel = 'arvel-skeen--win-and-walk-away';

test('Credits are public tokens in the resource zone, separate from Force and real resources', () => {
  const p = position();
  p.players[0].credits = ['one', 'two'];
  p.players[0].force = true;
  p.players[0].resources = [{ card: ids.consular, ref: 'secret' }];
  const { state, refs } = scenario(p);
  expect(state.players.alice!.resources).toEqual([refs.secret!]);
  expect(state.players.alice!.tokens).toHaveLength(3);
  expect(readyResourceCount(state, 'alice')).toBe(1);
  expect(decodeState(encodeState(state))).toEqual(state);
  for (const viewer of [{ role: 'player', playerId: 'bob' }, { role: 'spectator' }] as const) {
    const v = new Projector(state.gameId, viewer, 'k'.repeat(32)).project(state);
    expect(v.cards.filter(c => c.face?.cardId === 'credit')).toHaveLength(2);
    expect(v.cards.filter(c => c.zone === 'resources' && !c.face)).toHaveLength(1);
  }
  const deployed = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(deployed.cards[state.players.alice!.leader]!.deployedAs).toBeNull();
});

test('Credit payment offers a bounded subset, rejects invalid tokens, and recovers before any resource is paid', () => {
  const p = playCard(ids.marine);
  p.players[0].resources = [{ card: ids.marine }];
  p.players[0].credits = ['one', 'two', 'three'];
  p.players[1].credits = ['enemy'];
  const { state, refs } = scenario(p),
    pending = play(state, refs.played!);
  expect(pending.execution.frames[0]!.kind).toBe('credit-payment');
  expect(pending.execution.decision!.selection).toEqual({
    cards: [refs.one!, refs.two!, refs.three!],
    min: 1,
    max: 2,
  });
  expect(pending.cards[refs.played!]!.zone).toBe('hand');
  expect(readyResourceCount(pending, 'alice')).toBe(1);
  for (const selection of [
    [],
    [refs.enemy!],
    [refs.one!, refs.one!],
    [refs.one!, refs.two!, refs.three!],
  ])
    expect(() => pay(pending, selection)).toThrow();
  resume(pending, choose(pending, 'accept-effect', [refs.two!]));
  const done = pay(pending, [refs.two!]);
  expect(done.cards[refs.played!]!.zone).toBe('ground');
  expect(readyResourceCount(done, 'alice')).toBe(0);
  expect(credits(done, 'alice').map(c => c.instanceId)).toEqual([refs.one!, refs.three!]);
  expect(done.cards[refs.two!]!.zone).toBe('set-aside');
  expect(done.players.alice!.discard).not.toContain(refs.two!);
  expect(done.activePlayer).toBe('bob');
  const corrupt = structuredClone(pending);
  (corrupt.execution.frames[0] as any).amount++;
  expect(() => decodeState(encodeState(corrupt))).toThrow('Invalid Credit payment');
});

test('Players may keep every Credit or pay entirely with Credits; unrelated hidden cards stay hidden', () => {
  const p = playCard(ids.marine);
  p.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
  p.players[0].credits = ['one', 'two'];
  p.players[0].hand!.push({ card: ids.consular, ref: 'secret' });
  const { state, refs } = scenario(p),
    pending = play(state, refs.played!);
  const kept = pay(pending);
  expect(credits(kept, 'alice')).toHaveLength(2);
  expect(readyResourceCount(kept, 'alice')).toBe(0);
  const spent = pay(pending, [refs.one!, refs.two!]);
  expect(credits(spent, 'alice')).toHaveLength(0);
  expect(readyResourceCount(spent, 'alice')).toBe(2);
  const v = new Projector(
    pending.gameId,
    { role: 'player', playerId: 'bob' },
    'k'.repeat(32),
  ).project(pending);
  expect(v.decision).toBeNull();
  expect(JSON.stringify(v)).not.toContain(ids.consular);
  expect(
    v.events.some(e => e.type === 'revealed' && e.cards.some(c => c.cardId === ids.marine)),
  ).toBe(true);
});

test("Champion's KT9 creates a usable Credit without increasing the resource count", () => {
  const p = playCard('champion-s-kt9-podracer');
  p.players[0].base.card = 'administrator-s-tower';
  const { state, refs } = scenario(p),
    done = play(state, refs.played!);
  expect(credits(done, 'alice')).toHaveLength(1);
  expect(credits(done, 'alice')[0]!.zone).toBe('resources');
  expect(done.players.alice!.resources).toHaveLength(12);
  expect(readyResourceCount(done, 'alice')).toBe(9);
  expect(decodeState(encodeState(done))).toEqual(done);
});

test('Credit replacement applies to a paid trigger and preserves its original source/controller', () => {
  const p = playCard('boba-fett--for-a-price');
  p.players[0].resources = Array.from({ length: 9 }, () => ({ card: ids.marine }));
  p.players[0].credits = ['one'];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = pay(play(state, refs.played!)); // Keep Credit while paying printed/aspect cost.
  expect(readyResourceCount(s, 'alice')).toBe(0);
  s = step(s, 'accept-effect'); // Boba's optional payment.
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  resume(s, choose(s, 'accept-effect', [refs.one!]));
  s = pay(s, [refs.one!]);
  s = target(s, refs.enemy!);
  expect(s.cards[refs.enemy!]!.damage).toBe(3);
  expect(credits(s, 'alice')).toHaveLength(0);
});

test('Nested Sneak Attack payments preserve the ready entry and exact regroup defeat', () => {
  const p = playCard('sneak-attack');
  p.players[0].base.card = 'administrator-s-tower';
  p.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.marine }));
  p.players[0].credits = ['one', 'two', 'three'];
  p.players[0].hand!.push({ card: ids.consular, ref: 'unit' });
  const { state, refs } = scenario(p);
  let s = pay(play(state, refs.played!));
  s = play(s, refs.unit!);
  expect(s.execution.decision!.selection!.min).toBe(3);
  resume(s, choose(s, 'accept-effect', [refs.one!, refs.two!, refs.three!]));
  s = pay(s, [refs.one!, refs.two!, refs.three!]);
  expect(s.cards[refs.unit!]!.zone).toBe('ground');
  expect(s.cards[refs.unit!]!.exhausted).toBe(false);
  expect(s.delayedEffects[0]!.target!.instanceId).toBe(refs.unit!);
  s = nextRound(s);
  expect(s.cards[refs.unit!]!.zone).toBe('discard');
});

test('A free nested play does not consume Credits or create an unnecessary payment prompt', () => {
  const p = playCard(ids.marine);
  p.players[0].resources = [];
  p.players[0].credits = ['one'];
  const { state, refs } = scenario(p);
  state.execution.decision = null;
  state.execution.frames = [
    {
      kind: 'effect',
      playerId: 'alice',
      source: structuredClone(state.cards[state.players.alice!.leader]!),
      effect: {
        kind: 'play-card',
        from: 'hand',
        filter: { kind: 'unit' },
        free: true,
        optional: true,
      },
    },
    { kind: 'action' },
  ];
  settle(state);
  const s = play(state, refs.played!);
  expect(s.cards[refs.played!]!.zone).toBe('ground');
  expect(credits(s, 'alice')).toHaveLength(1);
  expect(s.execution.frames[0]!.kind).not.toBe('credit-payment');
});

test("Arvel may defeat either player's exact Credit, then damage a unit or either base", () => {
  for (const creditOwner of ['self', 'enemy']) {
    const p = playCard(arvel);
    p.players[creditOwner === 'self' ? 0 : 1].credits = ['credit'];
    const { state, refs } = scenario(p);
    let s = play(state, refs.played!);
    if (creditOwner === 'self') s = pay(s);
    expect(s.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(true);
    const declined = step(s, 'decline-effect');
    expect(declined.cards[refs.credit!]!.zone).toBe('resources');
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === refs.credit),
    );
    s = target(s, refs.credit!);
    s = target(s, s.players.bob!.base);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
    expect(s.cards[refs.credit!]!.zone).toBe('set-aside');
  }
});

test('Arvel On Attack spends a Credit before combat and still offers ordinary attacks without Credits', () => {
  const p = position();
  p.players[0].ground = [{ card: arvel, ref: 'arvel' }];
  p.players[1].credits = ['credit'];
  const { state, refs } = scenario(p);
  let s = step(
    state,
    i => i.kind === 'attack' && i.attacker === refs.arvel && i.defender === state.players.bob!.base,
  );
  s = target(s, refs.credit!);
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  const q = structuredClone(p);
  q.players[1].credits = [];
  const absent = scenario(q);
  const done = step(
    absent.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === absent.refs.arvel &&
      i.defender === absent.state.players.bob!.base,
  );
  expect(done.cards[done.players.bob!.base]!.damage).toBe(4);
});

test('Taramyn gives Experience to himself and another unit after defeating a Credit', () => {
  const p = playCard('taramyn-barcona--eyes-front-');
  p.players[1].credits = ['credit'];
  p.players[0].space = [{ card: ids.fighter, ref: 'ally' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.played!);
  s = target(s, refs.credit!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.played,
    ),
  ).toBe(false);
  s = target(s, refs.ally!);
  expect(upgrades(s, refs.played!)).toEqual(['experience']);
  expect(upgrades(s, refs.ally!)).toEqual(['experience']);
  const q = structuredClone(p);
  q.players[0].space = [];
  const alone = scenario(q);
  const done = target(play(alone.state, alone.refs.played!), alone.refs.credit!);
  expect(upgrades(done, alone.refs.played!)).toEqual(['experience']);
});

test('Defiant Scrapper can defeat only an enemy Credit and may decline', () => {
  const p = playCard('defiant-scrapper');
  p.players[0].credits = ['friendly'];
  p.players[1].credits = ['enemy'];
  const { state, refs } = scenario(p);
  const s = pay(play(state, refs.played!));
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => (o.intent as any).card),
  ).toEqual([refs.enemy!]);
  expect(step(s, 'decline-effect').cards[refs.enemy!]!.zone).toBe('resources');
  const done = target(s, refs.enemy!);
  expect(credits(done, 'alice')).toHaveLength(1);
  expect(credits(done, 'bob')).toHaveLength(0);
});

test('A spent Credit is replaced only by the newly played Podracer trigger', () => {
  const p = playCard('champion-s-kt9-podracer');
  p.players[0].base.card = 'administrator-s-tower';
  p.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.marine }));
  p.players[0].credits = ['old'];
  const { state, refs } = scenario(p);
  const done = pay(play(state, refs.played!), [refs.old!]);
  expect(done.cards[refs.old!]!.zone).toBe('set-aside');
  expect(credits(done, 'alice')).toHaveLength(1);
  expect(credits(done, 'alice')[0]!.instanceId).not.toBe(refs.old!);
  expect(readyResourceCount(done, 'alice')).toBe(0);
  const forged = structuredClone(done),
    id = credits(done, 'alice')[0]!.instanceId;
  forged.players.alice!.tokens = forged.players.alice!.tokens.filter(c => c !== id);
  forged.players.alice!.resources.push(id);
  expect(() => decodeState(encodeState(forged))).toThrow('Invalid player token role');
});

test('Credits reduce only the resource component of a compound payment; Force and exhaustion remain atomic costs', () => {
  const p = position();
  p.players[0].credits = ['credit'];
  p.players[0].force = true;
  const { state, refs } = scenario(p);
  const source = state.cards[state.players.alice!.leader]!;
  state.execution.decision = null;
  state.execution.frames = [
    {
      kind: 'effect',
      playerId: 'alice',
      source: structuredClone(source),
      effect: {
        kind: 'pay',
        costs: [{ kind: 'resources', amount: 1 }, { kind: 'force' }, { kind: 'exhaust-self' }],
        optional: true,
        effects: [{ kind: 'draw-cards', amount: 1 }],
      },
    },
    { kind: 'action' },
  ];
  settle(state);
  const declined = step(state, 'decline-effect');
  expect(credits(declined, 'alice')).toHaveLength(1);
  expect(declined.cards[source.instanceId]!.exhausted).toBe(false);
  const pending = step(state, 'accept-effect');
  expect(pending.cards[source.instanceId]!.exhausted).toBe(false);
  expect(pending.players.alice!.tokens).toHaveLength(2);
  resume(pending, choose(pending, 'accept-effect', [refs.credit!]));
  const done = pay(pending, [refs.credit!]);
  expect(done.cards[source.instanceId]!.exhausted).toBe(true);
  expect(done.players.alice!.tokens).toHaveLength(0);
  expect(done.players.alice!.hand).toHaveLength(1);
  const exhausted = structuredClone(state);
  exhausted.cards[source.instanceId]!.exhausted = true;
  exhausted.execution.decision = null;
  settle(exhausted);
  expect(exhausted.execution.frames[0]!.kind).toBe('action');
  expect(exhausted.players.alice!.tokens).toHaveLength(2);
  expect(exhausted.players.alice!.hand).toHaveLength(0);
  const noForce = structuredClone(p);
  noForce.players[0].force = false;
  const missing = scenario(noForce).state;
  missing.execution.decision = null;
  missing.execution.frames = structuredClone(state.execution.frames);
  settle(missing);
  expect(missing.execution.frames[0]!.kind).toBe('action');
  expect(credits(missing, 'alice')).toHaveLength(1);
  expect(missing.cards[source.instanceId]!.exhausted).toBe(false);
});
