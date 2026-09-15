import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { cannotReady, modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { move } from '../engine/state.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const alphabet = 'alphabet-squadron-u-wing--quiet-devotion',
  shadow = 'shadow-of-stygeon-prime';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const passToRegroup = (s: GameState) => step(step(s, 'pass'), 'pass');
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
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function effects(s: GameState, list: CardEffect[]) {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames('alice', state.cards[state.players.alice!.leader]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
}
const chooseTrigger = (s: GameState, id: string) => {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Missing trigger batch');
  const t = f.triggers.find(t => t.abilityId.endsWith(id))!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
};
const board = () => {
  const p = position();
  p.players[0].space = [{ card: alphabet, ref: 'alpha' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
};
test('Alphabet gives one Advantage to a chosen unit at regroup start, before drawing and readying', () => {
  const s = scenario(board()),
    pending = passToRegroup(s.state);
  expect(pending.phase).toBe('regroup');
  expect(pending.players.alice!.hand).toHaveLength(0);
  expect(pending.execution.decision!.options.map(o => o.intent)).toContainEqual({
    kind: 'target',
    card: s.refs.enemy!,
  });
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === s.refs.enemy),
  );
  const done = target(pending, s.refs.enemy!);
  expect(attachedUpgrades(done, done.cards[s.refs.enemy!]!).map(c => c.cardId)).toEqual([
    'advantage',
  ]);
  expect(done.players.alice!.hand).toHaveLength(2);
  expect(done.execution.decision!.kind).toBe('resource');
});
test('regroup triggers are captured before delayed defeats and still resolve from their departed source', () => {
  const p = board();
  p.players[0].discard = [{ card: 'sneak-attack', ref: 'sneak' }];
  p.delayed = [{ source: 'sneak', unit: 'alpha' }];
  const s = scenario(p),
    pending = passToRegroup(s.state);
  expect(pending.cards[s.refs.alpha!]!.zone).toBe('discard');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.enemy! },
  ]);
  resume(pending, choose(pending, 'target'));
  expect(
    attachedUpgrades(target(pending, s.refs.enemy!), pending.cards[s.refs.enemy!]!),
  ).toHaveLength(1);
});
test('phase-scoped ability loss expires before regroup triggers are collected', () => {
  const s = scenario(board());
  modifyUnit(
    s.state,
    s.state.cards[s.state.players.alice!.leader]!,
    s.state.cards[s.refs.alpha!]!,
    { kind: 'modify', power: 0, hp: 0, duration: 'phase', loseAbilities: true },
  );
  const pending = passToRegroup(s.state);
  expect(pending.execution.decision!.kind).toBe('effect');
  expect(pending.execution.frames[0]).toMatchObject({
    kind: 'effect',
    effect: { kind: 'select-unit' },
  });
});
test('Shadow cannot attach to a leader, prevents all readying, and its host deals regroup damage to its own base', () => {
  const p = position();
  p.players[0].hand = [{ card: shadow, ref: 'shadow' }];
  p.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  p.players[0].leader = {
    card: ids.leader,
    deployedAs: 'unit',
    ref: 'leader',
    abilityUses: { deploy: 1 },
  };
  p.players[1].space = [{ card: ids.fighter, ref: 'host', exhausted: true }];
  const s = scenario(p);
  expect(
    s.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.target === s.refs.leader,
    ),
  ).toBe(false);
  let state = step(
    s.state,
    i => i.kind === 'play' && i.card === s.refs.shadow && i.target === s.refs.host,
  );
  state = effects(state, [
    {
      kind: 'select-unit',
      filter: { name: 'TIE/ln Fighter' },
      bind: 'u',
      optional: false,
      effects: [{ kind: 'on-unit', target: 'u', operation: { kind: 'ready' } }],
    },
  ]);
  state = target(state, s.refs.host!);
  expect(state.cards[s.refs.host!]!.exhausted).toBe(true);
  state = passToRegroup(state);
  expect(state.cards[state.players.bob!.base]!.damage).toBe(2);
  expect(state.cards[state.players.alice!.base]!.damage).toBe(0);
  state = step(step(state, 'resource'), 'resource');
  expect(state.round).toBe(2);
  expect(state.cards[s.refs.host!]!.exhausted).toBe(true);
});
test('blanking a Shadow host removes its granted trigger but retains the upgrade’s own ready restriction', () => {
  const p = position();
  p.players[0].ground = [{ card: 'galen-erso--you-ll-never-win', ref: 'galen' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'host', exhausted: true }];
  p.attachments = [{ card: shadow, unit: 'host', owner: 'alice', ref: 'shadow' }];
  const s = scenario(p);
  s.state.namedEffects.push({
    appliesTo: 'enemy',
    expires: { kind: 'source-in-play' },
    id: 'name',
    source: { ...s.state.cards[s.refs.galen!]! },
    playerId: 'alice',
    name: 'TIE/ln Fighter',
    restriction: 'lose-abilities',
  });
  const regroup = passToRegroup(s.state);
  expect(regroup.cards[regroup.players.bob!.base]!.damage).toBe(0);
  expect(cannotReady(regroup, regroup.cards[s.refs.host!]!)).toBe(true);
});
test('blanking Shadow itself removes the ready restriction and its granted trigger', () => {
  const p = position();
  p.players[1].ground = [{ card: 'galen-erso--you-ll-never-win', ref: 'galen' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'host', exhausted: true }];
  p.attachments = [{ card: shadow, unit: 'host', owner: 'alice', ref: 'shadow' }];
  const s = scenario(p);
  s.state.namedEffects.push({
    appliesTo: 'enemy',
    expires: { kind: 'source-in-play' },
    id: 'name',
    source: { ...s.state.cards[s.refs.galen!]! },
    playerId: 'bob',
    name: 'Shadow of Stygeon Prime',
    restriction: 'lose-abilities',
  });
  let state = passToRegroup(s.state);
  expect(state.cards[state.players.bob!.base]!.damage).toBe(0);
  expect(cannotReady(state, state.cards[s.refs.host!]!)).toBe(false);
  state = step(step(state, 'resource'), 'resource');
  expect(state.cards[s.refs.host!]!.exhausted).toBe(false);
});
function commandeerBoard() {
  const p = position();
  p.players[0].hand = [{ card: 'commandeer', ref: 'event' }];
  p.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  p.players[1].space = [{ card: ids.fighter, ref: 'host', exhausted: true }];
  return p;
}
test('Commandeer filters actual Pilots, leader status and printed cost, then steals and readies an exact Vehicle', () => {
  const p = commandeerBoard();
  p.players[1].space!.push(
    { card: ids.fighter, ref: 'piloted' },
    { card: 'annihilator--tagge-s-flagship', ref: 'expensive' },
  );
  p.players[1].ground = [{ card: ids.marine, ref: 'nonvehicle' }];
  p.attachments = [
    { card: 'astromech-pilot', unit: 'piloted' },
    { card: 'shield', unit: 'host' },
  ];
  const s = scenario(p),
    pending = step(s.state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.host! },
  ]);
  resume(pending, choose(pending, 'target'));
  const done = target(pending, s.refs.host!);
  expect(done.cards[s.refs.host!]!).toMatchObject({
    controller: 'alice',
    owner: 'bob',
    exhausted: false,
  });
  expect(done.delayedEffects).toHaveLength(1);
  const view = new Projector(done.gameId, { role: 'player', playerId: 'alice' }).project(done);
  expect(gameViewSchema.parse(view)).toEqual(view);
  expect(view.scheduled[0]!.kind).toBe('return-at-regroup');
  const regroup = passToRegroup(done);
  expect(regroup.cards[s.refs.host!]!).toMatchObject({
    zone: 'hand',
    controller: 'bob',
    owner: 'bob',
  });
  expect(regroup.delayedEffects).toEqual([]);
});
test('a controlled Alphabet returns before its captured regroup abilities resolve, retaining their controller and upgrade origins', () => {
  const p = commandeerBoard();
  p.players[1].space = [{ card: alphabet, ref: 'host', exhausted: true }];
  p.players[1].ground = [{ card: ids.marine, ref: 'other' }];
  p.attachments = [{ card: shadow, unit: 'host', owner: 'bob', ref: 'shadow' }];
  const s = scenario(p),
    controlled = target(step(s.state, 'play'), s.refs.host!);
  expect(controlled.cards[s.refs.host!]!.exhausted).toBe(true);
  let state = passToRegroup(controlled);
  expect(state.cards[s.refs.host!]!.zone).toBe('hand');
  expect(state.cards[s.refs.shadow!]!.zone).toBe('discard');
  expect(state.execution.decision!.playerId).toBe('alice');
  resume(state, choose(state, 'trigger'));
  state = chooseTrigger(state, 'regroup-advantage');
  state = target(state, s.refs.other!);
  expect(state.cards[state.players.alice!.base]!.damage).toBe(2);
  expect(state.cards[state.players.bob!.base]!.damage).toBe(0);
});
test('Commandeer does not ready a Vehicle already controlled by its player, but still schedules its return', () => {
  const p = commandeerBoard();
  p.players[1].space = [];
  p.players[0].space = [{ card: ids.fighter, ref: 'host', exhausted: true }];
  const s = scenario(p),
    done = target(step(s.state, 'play'), s.refs.host!);
  expect(done.cards[s.refs.host!]!.exhausted).toBe(true);
  expect(done.delayedEffects).toHaveLength(1);
  expect(passToRegroup(done).cards[s.refs.host!]!.zone).toBe('hand');
});
test('Commandeer’s delayed return survives source movement and control changes but never follows a new incarnation', () => {
  for (const reenter of [false, true]) {
    const s = scenario(commandeerBoard());
    let state = target(step(s.state, 'play'), s.refs.host!),
      unit = state.cards[s.refs.host!]!;
    move(state, state.cards[s.refs.event!]!, 'deck');
    if (reenter) {
      move(state, unit, 'hand');
      move(state, unit, 'space');
    } else unit.controller = 'bob';
    state = passToRegroup(state);
    expect(state.cards[s.refs.host!]!.zone).toBe(reenter ? 'space' : 'hand');
  }
});
