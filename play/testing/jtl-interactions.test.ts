import { indirectFrame } from '../engine/indirect.ts';
import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { move, reference } from '../engine/state.ts';
import { readyInPlay } from '../engine/ready.ts';
import { attach, attachedUpgrades } from '../engine/attachments.ts';
import type { GameState, CardInstance } from '../engine/model.ts';
function dealDamage(
  s: GameState,
  assignments: { target: CardInstance; amount: number; unpreventable?: boolean }[],
  actor: string,
  source: CardInstance,
) {
  s.execution.frames.unshift({
    kind: 'damage',
    actor,
    assignments: assignments.map(a => ({
      ...a,
      target: reference(a.target),
      source: structuredClone(source),
      preventedBy: null,
    })),
  });
}

import { changeControl } from '../engine/control.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { scenario } from './scenario.ts';
import {
  board,
  play,
  attack,
  step,
  target,
  select,
  mode,
  blank,
  stats,
  keyword,
  tokens,
  options,
  nextOwn,
  refresh,
  ids,
  position,
  drain,
} from './jtl-helpers.ts';

test('Anakin offers only his exact upgrade after his surviving host attacks', () => {
  const p = board('anakin-skywalker--i-ll-try-spinning');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const g = scenario(p);
  let s = nextOwn(play(g.state, g.refs.source!, g.refs.host!));
  s = attack(s, g.refs.host!);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.source!]);
  s = select(s, g.refs.source!);
  expect(s.cards[g.refs.source!]!.zone).toBe('hand');
  expect(stats(s, g.refs.host!).power).toBe(4);
});
test('Anakin does not trigger for a defending or defeated host', () => {
  for (const defeated of [false, true]) {
    const p = position();
    p.activePlayer = 'bob';
    p.players[0].space = [{ card: 'munificent-frigate', ref: 'host', damage: defeated ? 6 : 0 }];
    p.players[1].space = [{ card: 'munificent-frigate', ref: 'attacker' }];
    p.attachments = [{ card: 'anakin-skywalker--i-ll-try-spinning', unit: 'host', ref: 'pilot' }];
    const g = scenario(p);
    const s = attack(g.state, g.refs.attacker!, g.refs.host!);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.cards[g.refs.host!]!.zone).toBe(defeated ? 'discard' : 'space');
  }
});
for (const owner of ['alice', 'bob'])
  test(`Close the Shield Gate protects either base and consumes only the next preventable packet (${owner})`, () => {
    const g = scenario(board('close-the-shield-gate'));
    let s = target(play(g.state, g.refs.source!), g.state.players[owner]!.base);
    const base = s.cards[s.players[owner]!.base]!;
    dealDamage(
      s,
      [{ target: base, amount: 4, unpreventable: true }],
      'alice',
      s.cards[s.players.alice!.leader]!,
    );
    refresh(s);
    expect(base.damage).toBe(4);
    expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(true);
    dealDamage(s, [{ target: base, amount: 9 }], 'alice', s.cards[s.players.alice!.leader]!);
    refresh(s);
    if (s.execution.decision?.kind === 'replacement') s = step(s, () => true);
    expect(s.cards[base.instanceId]!.damage).toBe(4);
    expect(s.lastingEffects.some(e => e.preventNextDamage)).toBe(false);
    dealDamage(
      s,
      [{ target: s.cards[base.instanceId]!, amount: 2 }],
      'alice',
      s.cards[s.players.alice!.leader]!,
    );
    refresh(s);
    expect(s.cards[base.instanceId]!.damage).toBe(6);
  });
for (const shielded of [false, true])
  test(`Dorsal Turret defeats only a unit actually dealt combat damage (${shielded})`, () => {
    const p = position();
    p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
    p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
    p.attachments = [
      { card: 'dorsal-turret', unit: 'host' },
      ...(shielded ? [{ card: 'shield', unit: 'enemy' }] : []),
    ];
    const g = scenario(p);
    let s = attack(g.state, g.refs.host!, g.refs.enemy!);
    if (shielded && s.execution.decision?.kind === 'replacement') s = step(s, 'target');
    expect(s.cards[g.refs.enemy!]!.zone).toBe(shielded ? 'space' : 'discard');
    expect(s.cards[g.refs.host!]!.zone).toBe('discard');
  });
test('Dorsal Turret does not defeat the attacker when its host defends', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  p.attachments = [{ card: 'dorsal-turret', unit: 'host' }];
  const g = scenario(p);
  const s = attack(g.state, g.refs.enemy!, g.refs.host!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('space');
});
test('I Have You Now protects through the whole attack and expires afterward', () => {
  const p = board('i-have-you-now');
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = attack(target(play(g.state, g.refs.source!), g.refs.host!), g.refs.host!, g.refs.enemy!);
  if (s.execution.decision?.kind === 'replacement')
    if (s.execution.decision?.kind === 'replacement') s = step(s, () => true);
  expect(s.cards[g.refs.host!]!.zone).toBe('space');
  expect(s.cards[g.refs.host!]!.damage).toBe(0);
  expect(s.lastingEffects.some(e => e.preventAllDamage)).toBe(false);
});
test('Iden shields on ordinary Pilot play and on reattachment, while her unit side has Shielded', () => {
  const p = board('iden-versio--adapt-or-die');
  p.players[0].space = [
    { card: 'munificent-frigate', ref: 'first' },
    { card: 'munificent-frigate', ref: 'second' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!, g.refs.first!);
  expect(tokens(s, g.refs.first!, 'shield')).toBe(1);
  attach(s, s.cards[g.refs.source!]!, s.cards[g.refs.second!]!);
  s.execution.frames.unshift({ kind: 'flush-triggers' });
  refresh(s);
  s = drain(s);
  expect(tokens(s, g.refs.second!, 'shield')).toBe(1);
  const h = scenario(board('iden-versio--adapt-or-die'));
  expect(tokens(play(h.state, h.refs.source!), h.refs.source!, 'shield')).toBe(1);
});
test('Jarek checks his own controller’s arenas even when attached to an enemy-controlled Vehicle', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[0].space = [
    { card: 'munificent-frigate', ref: 'host' },
    { card: ids.fighter, ref: 'space' },
  ];
  p.attachments = [
    { card: 'jarek-yeager--coordinating-with-the-resistance', unit: 'host', ref: 'pilot' },
  ];
  const g = scenario(p);
  expect(keyword(g.state, g.refs.host!, 'Sentinel')).toBe(true);
  changeControl(g.state, g.state.cards[g.refs.host!]!, 'bob');
  expect(keyword(g.state, g.refs.host!, 'Sentinel')).toBe(true);
  move(g.state, g.state.cards[g.refs.space!]!, 'discard');
  expect(keyword(g.state, g.refs.host!, 'Sentinel')).toBe(false);
});
test('Kimogila exhausts only surviving units damaged by its own indirect packet', () => {
  const p = board('kimogila-heavy-fighter');
  p.players[1].ground = [
    { card: ids.consular, ref: 'damaged' },
    { card: ids.marine, ref: 'earlier', damage: 1 },
    { card: ids.trooper, ref: 'defeated' },
  ];
  const g = scenario(p);
  let s = step(
    play(g.state, g.refs.source!),
    i => i.kind === 'choose-player' && i.playerId === 'bob',
  );
  s = select(s, g.refs.damaged!, g.refs.defeated!, s.players.bob!.base);
  expect(s.cards[g.refs.damaged!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.earlier!]!.exhausted).toBe(false);
  expect(s.cards[g.refs.defeated!]!.zone).toBe('discard');
});
for (const boosted of [false, true])
  test(`Rampart only skips the regroup ready step below four power (${boosted})`, () => {
    const p = board('rampart--enjoy-the-exit', false);
    p.players[0].space![0]!.exhausted = true;
    if (boosted) p.attachments = [{ card: 'experience', unit: 'source' }];
    const g = scenario(p);
    readyInPlay(g.state, [g.state.cards[g.refs.source!]!], true);
    expect(g.state.cards[g.refs.source!]!.exhausted).toBe(!boosted);
    if (!boosted) {
      readyInPlay(g.state, [g.state.cards[g.refs.source!]!]);
      expect(g.state.cards[g.refs.source!]!.exhausted).toBe(false);
    }
  });
for (const recipient of ['alice', 'bob'])
  test(`Targeting Computer assigns its host's indirect damage to either player (${recipient})`, () => {
    const p = position();
    p.players[0].space = [
      { card: 'munificent-frigate', ref: 'host' },
      { card: 'tactical-heavy-bomber', ref: 'other' },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [
      { card: 'targeting-computer', unit: 'host' },
      { card: 'dengar--crude-and-slovenly', unit: 'host' },
    ];
    const g = scenario(p);
    let s = attack(g.state, g.refs.host!);
    s = step(s, i => i.kind === 'choose-player' && i.playerId === recipient);
    expect(s.execution.decision!.playerId).toBe('alice');
    s = select(s, s.players[recipient]!.base, s.players[recipient]!.base);
    expect(s.cards[s.players[recipient]!.base]!.damage).toBeGreaterThanOrEqual(2);
    expect(attack(g.state, g.refs.other!).execution.decision!.playerId).toBe('bob');
  });
test('U-Wing Lander creates three Experience and can transfer one to another friendly Vehicle', () => {
  const p = board('u-wing-lander');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = nextOwn(play(g.state, g.refs.source!));
  expect(tokens(s, g.refs.source!)).toBe(3);
  s.cards[g.refs.source!]!.exhausted = false;
  refresh(s);
  s = attack(s, g.refs.source!);
  const experience = s.execution.decision!.selection!.cards[0]!;
  s = select(s, experience);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.host!]);
  s = target(s, g.refs.host!);
  expect(tokens(s, g.refs.host!)).toBe(1);
  expect(tokens(s, g.refs.source!)).toBe(2);
});
test('Hondo excludes Pilot upgrades and can steal an upgrade onto himself', () => {
  const p = board('hondo-ohnaka--superfluous-swindler', false);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'vehicle' }];
  p.attachments = [
    { card: 'academy-training', unit: 'enemy', ref: 'upgrade' },
    { card: 'bb-8--happy-beeps', unit: 'vehicle', ref: 'pilot' },
  ];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.pilot!);
  s = select(s, g.refs.upgrade!);
  expect(s.cards[g.refs.upgrade!]!.controller).toBe('alice');
  expect(options(s).some(i => i.kind === 'target' && i.card === g.refs.enemy)).toBe(false);
  s = target(s, g.refs.source!);
  expect(s.cards[g.refs.upgrade!]!.attachedTo?.instanceId).toBe(g.refs.source!);
});
for (const pay of [false, true])
  test(`In Debt asks the host controller to pay after readying (${pay})`, () => {
    const p = position();
    p.players[1].resources = Array.from({ length: 2 }, () => ({ card: ids.marine }));
    p.players[1].ground = [{ card: ids.marine, ref: 'host', exhausted: true }];
    p.attachments = [{ card: 'in-debt-to-crimson-dawn', unit: 'host', owner: 'alice' }];
    const g = scenario(p);
    readyInPlay(g.state, [g.state.cards[g.refs.host!]!]);
    g.state.execution.frames.unshift({ kind: 'flush-triggers' });
    refresh(g.state);
    let s = drain(g.state);
    expect(s.execution.decision!.playerId).toBe('bob');
    s = step(s, pay ? 'accept-effect' : 'decline-effect');
    expect(s.cards[g.refs.host!]!.exhausted).toBe(!pay);
    expect(s.players.bob!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(pay ? 2 : 0);
  });

test('Unit-only prevention does not protect a base', () => {
  const p = position();
  p.players[0].space = [{ card: 'vigil--securing-the-future' }];
  const g = scenario(p);
  dealDamage(
    g.state,
    [{ target: g.state.cards[g.state.players.alice!.base]!, amount: 3 }],
    'bob',
    g.state.cards[g.state.players.bob!.leader]!,
  );
  refresh(g.state);
  expect(g.state.cards[g.state.players.alice!.base]!.damage).toBe(3);
});

test('I Have You Now protects before On Attack choices and ignores ability loss on its target', () => {
  const p = board('i-have-you-now');
  p.players[0].space = [{ card: 'banshee--crippling-command', ref: 'host', damage: 1 }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = attack(target(play(g.state, g.refs.source!), g.refs.host!), g.refs.host!, g.refs.enemy!);
  blank(s, g.refs.host!);
  s = target(s, g.refs.host!);
  expect(s.cards[g.refs.host!]!.zone).toBe('space');
  expect(s.cards[g.refs.host!]!.damage).toBe(1);
});

test('Anakin remains attached when his attacking host is defeated', () => {
  const p = position();
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].space = [{ card: 'occupier-siege-tank', movedArena: true, ref: 'enemy' }];
  p.attachments = [{ card: 'anakin-skywalker--i-ll-try-spinning', unit: 'host', ref: 'pilot' }];
  const g = scenario(p);
  const s = attack(g.state, g.refs.host!, g.refs.enemy!);
  expect(s.cards[g.refs.pilot!]!.zone).toBe('discard');
  expect(s.execution.decision!.kind).toBe('action');
});

for (const blanked of ['host', 'upgrade'])
  test(`In Debt's direct ability survives host blanking only (${blanked})`, () => {
    const p = position();
    p.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
    p.players[0].ground = [{ card: ids.marine, ref: 'host', exhausted: true }];
    p.attachments = [{ card: 'in-debt-to-crimson-dawn', unit: 'host', ref: 'upgrade' }];
    const g = scenario(p);
    blank(g.state, g.refs[blanked]!);
    readyInPlay(g.state, [g.state.cards[g.refs.host!]!]);
    g.state.execution.frames.unshift({ kind: 'flush-triggers' });
    refresh(g.state);
    let s = drain(g.state);
    if (blanked === 'host') s = step(s, 'decline-effect');
    expect(s.cards[g.refs.host!]!.exhausted).toBe(blanked === 'host');
  });

test('Losing Rampart’s restriction allows regroup readiness below four power', () => {
  const p = board('rampart--enjoy-the-exit', false);
  p.players[0].space![0]!.exhausted = true;
  const g = scenario(p);
  blank(g.state, g.refs.source!);
  readyInPlay(g.state, [g.state.cards[g.refs.source!]!], true);
  expect(g.state.cards[g.refs.source!]!.exhausted).toBe(false);
});

test('Targeting Computer uses the departed unit’s abilities and does not affect a later incarnation', () => {
  const p = position();
  p.players[0].space = [{ card: 'tactical-heavy-bomber', ref: 'host' }];
  p.attachments = [{ card: 'targeting-computer', unit: 'host' }];
  const g = scenario(p);
  const old = structuredClone(g.state.cards[g.refs.host!]!);
  move(g.state, g.state.cards[g.refs.host!]!, 'discard');
  expect(indirectFrame(g.state, 'alice', old, 'bob', 3).assigner).toBe('alice');
  move(g.state, g.state.cards[g.refs.host!]!, 'space');
  expect(indirectFrame(g.state, 'alice', g.state.cards[g.refs.host!]!, 'bob', 3).assigner).toBe(
    'bob',
  );
  expect(indirectFrame(g.state, 'alice', old, 'bob', 3).assigner).toBe('alice');
});

test('Targeting Computer stops assigning for a host that loses abilities', () => {
  const p = position();
  p.players[0].space = [{ card: 'tactical-heavy-bomber', ref: 'host' }];
  p.attachments = [{ card: 'targeting-computer', unit: 'host' }];
  const g = scenario(p);
  blank(g.state, g.refs.host!);
  expect(indirectFrame(g.state, 'alice', g.state.cards[g.refs.host!]!, 'bob', 3).assigner).toBe(
    'bob',
  );
});
