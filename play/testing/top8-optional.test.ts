import { decodeState } from '../engine/checkpoint.ts';
import { effectFrames } from '../engine/triggers.ts';
import { settle } from '../engine/advance.ts';
import type { CardEffect } from '../cards/definition.ts';
import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { credits, readyResourceCount } from '../engine/credits.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
const tokens = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && ['ground', 'space'].includes(c.zone));
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function trigger(s: GameState, abilityId: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === abilityId)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function regroup(s: GameState) {
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

function triggers(s: GameState) {
  for (let n = 0; n < 15 && s.execution.decision?.kind === 'trigger'; n++) s = step(s, 'trigger');
  return s;
}
const podracer = 'sebulba-s-podracer--taking-the-lead';
const bothan = 'bothan-5--new-republic-prison-ship';
const sebulba = 'sebulba--especially-dangerous-dug';
const use = (s: GameState, id: string) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
function effects(s: GameState, effects: CardEffect[]) {
  const next = structuredClone(s);
  next.execution.decision = null;
  next.execution.frames = [
    ...effectFrames('alice', next.cards[next.players.alice!.leader]!, effects),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(next);
  return next;
}
const selfMill: CardEffect = {
  kind: 'mill',
  player: 'self',
  count: 1,
  bind: 'milled',
  effects: [],
};

test('Podracer can decline a deck discard trigger and ready on a later discard in the same round', () => {
  const p = playFixture(ids.marine);
  p.players[0].leader = { card: sebulba };
  p.players[0].ground = [
    { card: podracer, ref: 'pod', exhausted: true },
    { card: ids.marine, ref: 'marine' },
    { card: 'bt-1--blastomech', ref: 'bt' },
  ];
  const g = scenario(p);
  let s = use(g.state, 'reckless-raid');
  s = target(s, g.refs.marine!);
  expect(s.execution.frames[0]?.kind).toBe('optional-trigger');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  resume(s, choose(s, 'decline-effect'));
  s = step(s, 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = step(s, 'pass');
  s = attack(s, g.refs.bt!, s.players.bob!.base);
  expect(s.execution.frames[0]?.kind).toBe('optional-trigger');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.pod!]!.exhausted).toBe(false);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
});

test('Podracer limit belongs to the exact copy, resets next round, and ignores hand discards', () => {
  const p = playFixture(ids.marine);
  p.players[0].ground = [{ card: podracer, ref: 'pod', exhausted: true }];
  const g = scenario(p);
  let s = effects(g.state, [selfMill]);
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.pod!]!.exhausted).toBe(false);
  s = effects(s, [selfMill]);
  expect(s.execution.frames[0]?.kind).not.toBe('optional-trigger');
  s = regroup(s);
  s = effects(s, [selfMill]);
  expect(s.execution.frames[0]?.kind).toBe('optional-trigger');
  const hand = effects(g.state, [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: 1,
      max: 1,
      bind: 'discard',
      effects: [{ kind: 'move-card', target: 'discard', from: 'hand', to: 'discard' }],
    },
  ]);
  const done = step(hand, 'accept-effect', [g.refs.played!]);
  expect(done.execution.frames[0]?.kind).not.toBe('optional-trigger');
  expect(done.cards[g.refs.pod!]!.exhausted).toBe(true);
});

test('discarding an opponent deck does not count as that opponent discarding, and an empty mill does not trigger', () => {
  const p = playFixture(ids.marine);
  p.players[1].ground = [{ card: podracer, ref: 'enemy-pod', exhausted: true }];
  const g = scenario(p);
  const s = effects(g.state, [{ ...selfMill, player: 'enemy' }]);
  expect(s.execution.frames[0]?.kind).toBe('action');
  expect(s.cards[g.refs['enemy-pod']!]!.exhausted).toBe(true);
  const q = playFixture(ids.marine);
  q.players[0].deck = [];
  q.players[0].ground = [{ card: podracer, exhausted: true }];
  expect(effects(scenario(q).state, [selfMill]).execution.frames[0]?.kind).toBe('action');
});

test('multiple discarded cards create separate optional triggers without consuming a declined use', () => {
  const p = playFixture(ids.marine);
  p.players[0].ground = [{ card: podracer, ref: 'pod', exhausted: true }];
  const g = scenario(p);
  let s = effects(g.state, [{ ...selfMill, count: 2 }]);
  s = step(s, 'trigger');
  s = step(s, 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  expect(s.execution.frames[0]?.kind).toBe('optional-trigger');
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.pod!]!.exhausted).toBe(false);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
});

test('Bothan 5 captures the exact defeated friendly non-Vehicle from its owner discard and later rescues it', () => {
  const p = playFixture('open-fire');
  p.players[0].space = [{ card: bothan, ref: 'ship', damage: 1 }];
  p.players[0].ground = [
    { card: ids.marine, ref: 'victim' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[0].hand!.push({ card: 'open-fire', ref: 'second' });
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
  s = target(s, g.refs.victim!);
  expect(s.players.alice!.discard).toContain(g.refs.victim!);
  expect(s.execution.frames[0]?.kind).toBe('optional-trigger');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.victim!]!.zone).toBe('captured');
  expect(s.cards[g.refs.victim!]!.capturedBy?.instanceId).toBe(g.refs.ship!);
  expect(s.cards[g.refs.other!]!.zone).toBe('ground');
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.second);
  s = target(s, g.refs.ship!);
  expect(s.cards[g.refs.victim!]!.zone).toBe('ground');
  expect(s.cards[g.refs.victim!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.victim!]!.damage).toBe(0);
});

test('declining Bothan 5 preserves the option for another friendly defeat that round', () => {
  const p = playFixture('open-fire');
  p.players[0].space = [{ card: bothan, ref: 'ship', damage: 1 }];
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[0].hand!.push({ card: 'open-fire', ref: 'second' });
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
  s = target(s, g.refs.one!);
  s = step(s, 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.second);
  s = target(s, g.refs.two!);
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.one!]!.zone).toBe('discard');
  expect(s.cards[g.refs.two!]!.zone).toBe('captured');
});

test('Bothan 5 excludes Vehicles and itself, and cannot capture a stolen unit from another owner discard', () => {
  for (const kind of ['vehicle', 'self', 'stolen']) {
    const p = playFixture('open-fire');
    p.players[0].space = [{ card: bothan, ref: 'ship', damage: 1 }];
    if (kind === 'vehicle') p.players[0].space.push({ card: ids.fighter, ref: 'victim' });
    if (kind === 'stolen')
      p.players[1].ground = [{ card: ids.marine, ref: 'victim', controller: 'alice' }];
    const g = scenario(p);
    let s = step(g.state, 'play');
    s = target(s, kind === 'self' ? g.refs.ship! : g.refs.victim!);
    if (kind === 'stolen') s = step(s, 'accept-effect');
    expect(Object.values(s.cards).some(c => c.zone === 'captured')).toBe(false);
    if (kind !== 'stolen') expect(s.roundHistory.triggerUses).toHaveLength(0);
  }
});

test('a Bothan 5 defeated simultaneously with its subject cannot guard it from discard', () => {
  const p = playFixture(ids.marine);
  p.players[0].space = [{ card: bothan, ref: 'ship', damage: 1 }];
  p.players[0].ground = [{ card: ids.marine, ref: 'victim' }];
  const g = scenario(p);
  let s = effects(g.state, [
    { kind: 'damage-units', amount: 5, filter: { controller: 'friendly' } },
  ]);
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.ship!]!.zone).toBe('discard');
  expect(s.cards[g.refs.victim!]!.zone).toBe('discard');
});

test('Rancor Keeper decline does not spend its once-per-round use before a later survival', () => {
  const p = playFixture(ids.marine);
  p.players[0].ground = [
    { card: 'rancor-keeper', ref: 'keeper' },
    { card: ids.consular, ref: 'unit' },
  ];
  const g = scenario(p);
  const damage: CardEffect = {
    kind: 'damage-units',
    amount: 1,
    filter: { name: 'Consular Security Force' },
  };
  let s = effects(g.state, [damage]);
  expect(s.execution.frames[0]?.kind).toBe('optional-trigger');
  s = step(s, 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = effects(s, [damage]);
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [s.players.bob!.base]);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
});

test('optional trigger checkpoints reject a spent use and restrict choice ownership', () => {
  const p = playFixture(ids.marine);
  p.players[0].ground = [{ card: podracer, ref: 'pod', exhausted: true }];
  const g = scenario(p);
  const s = effects(g.state, [selfMill]);
  const used = step(s, 'accept-effect');
  const invalid = structuredClone(s);
  invalid.roundHistory.triggerUses = used.roundHistory.triggerUses;
  expect(() => decodeState(encodeState(invalid))).toThrow();
  const view = new Projector(
    s.gameId,
    { role: 'player', playerId: 'alice' },
    'x'.repeat(32),
  ).project(s);
  expect(view.decision!.effect).toBe('optional-trigger');
  expect(view.decision!.source?.name).toContain('Podracer');
  expect(
    new Projector(s.gameId, { role: 'player', playerId: 'bob' }, 'x'.repeat(32)).project(s)
      .decision,
  ).toBeNull();
});
