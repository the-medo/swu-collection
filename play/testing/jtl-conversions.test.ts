import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { move, reference, playCost } from '../engine/state.ts';
import { attach, reattachmentTargets } from '../engine/attachments.ts';
import { detachPilot } from '../engine/pilot-conversion.ts';
import { isUnit } from '../engine/attachments.ts';
import { isUpgrade } from '../engine/roles.ts';
import { changeControl } from '../engine/control.ts';
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
function flush(s: ReturnType<typeof scenario>['state']) {
  s.execution.frames.unshift({ kind: 'flush-triggers' });
  refresh(s);
  return drain(s);
}

test('Poe can attach to his newly created X-Wing without another play or incarnation', () => {
  const g = scenario(board('poe-dameron--one-hell-of-a-pilot'));
  let s = play(g.state, g.refs.source!);
  const unit = s.space.find(id => s.cards[id]!.cardId === 'x-wing')!;
  const before = s.cards[g.refs.source!]!.incarnation;
  s = target(s, unit);
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(s.cards[g.refs.source!]!.incarnation).toBe(before);
  expect(stats(s, unit)).toEqual({ power: 4, hp: 5 });
  expect(s.phaseHistory.played).toHaveLength(1);
});
test('Poe can decline attaching and has no launch trigger when played using Piloting', () => {
  const g = scenario(board('poe-dameron--one-hell-of-a-pilot'));
  const s = step(play(g.state, g.refs.source!), 'decline-effect');
  expect(isUnit(s, s.cards[g.refs.source!]!)).toBe(true);
  const p = board('poe-dameron--one-hell-of-a-pilot');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const h = scenario(p);
  const t = play(h.state, h.refs.source!, h.refs.host!);
  expect(t.space.filter(id => t.cards[id]!.cardId === 'x-wing')).toHaveLength(0);
  expect(isUpgrade(t, t.cards[h.refs.source!]!)).toBe(true);
});
test('Poe’s converted attachment retains a friendly unpiloted Vehicle restriction for reattachment', () => {
  const p = board('poe-dameron--one-hell-of-a-pilot');
  p.players[0].space = [
    { card: 'munificent-frigate', ref: 'other' },
    { card: 'munificent-frigate', ref: 'occupied' },
  ];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  p.attachments = [{ card: 'bb-8--happy-beeps', unit: 'occupied' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  s = target(s, s.space.find(id => s.cards[id]!.cardId === 'x-wing')!);
  expect(reattachmentTargets(s, s.cards[g.refs.source!]!).map(c => c.instanceId)).toEqual([
    g.refs.other!,
  ]);
  attach(s, s.cards[g.refs.source!]!, s.cards[g.refs.other!]!);
  expect(s.cards[g.refs.source!]!.attachedTo!.instanceId).toBe(g.refs.other!);
});
test('Sidon boards only an enemy Vehicle without a Pilot and can defeat it through his negative HP', () => {
  const p = board('sidon-ithano--the-crimson-corsair');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'friendly' }];
  p.players[1].space = [
    { card: ids.fighter, ref: 'enemy' },
    { card: 'munificent-frigate', ref: 'occupied' },
  ];
  p.attachments = [{ card: 'bb-8--happy-beeps', unit: 'occupied' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.enemy!]);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
});
test('Sidon has no normal Piloting play and remains a unit if attachment is declined', () => {
  const p = board('sidon-ithano--the-crimson-corsair');
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  expect(options(g.state).some(i => i.kind === 'play' && i.piloting)).toBe(false);
  const s = step(play(g.state, g.refs.source!), 'decline-effect');
  expect(isUnit(s, s.cards[g.refs.source!]!)).toBe(true);
});
test('Phantom II docks to either player’s The Ghost, cleans its upgrades and damage, and keeps its action text', () => {
  const p = board('phantom-ii--modified-to-dock', false);
  p.players[0].space![0]!.damage = 1;
  p.players[1].space = [
    { card: 'the-ghost--home-of-the-spectres', ref: 'ghost' },
    { card: 'munificent-frigate', ref: 'wrong' },
  ];
  p.attachments = [{ card: 'experience', unit: 'source', ref: 'experience' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.source);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.ghost!]);
  s = target(s, g.refs.ghost!);
  expect(s.cards[g.refs.source!]!.damage).toBe(0);
  expect(s.cards[g.refs.experience!]!.zone).toBe('set-aside');
  expect(keyword(s, g.refs.ghost!, 'Grit')).toBe(true);
  expect(s.cards[g.refs.source!]!.incarnation).toBe(g.state.cards[g.refs.source!]!.incarnation);
  s = nextOwn(s);
  const before = s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length;
  s = step(s, i => i.kind === 'use-ability' && i.card === g.refs.source);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(before + 1);
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
});
test('Phantom conversion waits for an attached Luke’s replacement before clearing unit damage', () => {
  const p = board('phantom-ii--modified-to-dock', false);
  p.players[0].space![0]!.damage = 4;
  p.players[0].space!.push({ card: 'the-ghost--home-of-the-spectres', ref: 'ghost' });
  p.attachments = [{ card: 'luke-skywalker--you-still-with-me-', unit: 'source', ref: 'luke' }];
  const g = scenario(p);
  let s = target(
    step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.source),
    g.refs.ghost!,
  );
  expect(s.execution.decision!.kind).toBe('replacement');
  s = step(s, 'accept-effect');
  expect(isUnit(s, s.cards[g.refs.luke!]!)).toBe(true);
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(s.cards[g.refs.source!]!.damage).toBe(0);
});
for (const take of [false, true])
  test(`Pantoran Starship Thief pays three before boarding and changes control only when accepted (${take})`, () => {
    const p = board('pantoran-starship-thief');
    p.players[1].space = [
      { card: 'munificent-frigate', ref: 'capital' },
      { card: 'cloaked-starviper', ref: 'fighter' },
    ];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    const before = s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length;
    s = step(s, take ? 'accept-effect' : 'decline-effect');
    if (take) {
      expect(
        options(s)
          .filter(i => i.kind === 'target')
          .map(i => i.card),
      ).toEqual([g.refs.fighter!]);
      s = target(s, g.refs.fighter!);
    }
    expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(
      before + (take ? 3 : 0),
    );
    expect(s.cards[g.refs.fighter!]!.controller).toBe(take ? 'alice' : 'bob');
  });
for (const departure of ['return', 'detach', 'reattach'])
  test(`Pantoran returns the former host to its owner when it leaves that host (${departure})`, () => {
    const p = board('pantoran-starship-thief');
    p.players[1].space = [
      { card: 'cloaked-starviper', ref: 'host' },
      { card: 'cloaked-starviper', ref: 'other' },
    ];
    const g = scenario(p);
    let s = target(step(play(g.state, g.refs.source!), 'accept-effect'), g.refs.host!);
    if (departure === 'return') move(s, s.cards[g.refs.source!]!, 'hand');
    else if (departure === 'detach')
      detachPilot(s, s.cards[g.refs.source!]!, s.cards[s.players.alice!.leader]!);
    else attach(s, s.cards[g.refs.source!]!, s.cards[g.refs.other!]!);
    s = flush(s);
    expect(s.cards[g.refs.host!]!.controller).toBe('bob');
    expect(s.cards[g.refs.other!]!.controller).toBe('bob');
  });
test('Blanking the Thief before it detaches suppresses its control-return trigger', () => {
  const p = board('pantoran-starship-thief');
  p.players[1].space = [{ card: 'cloaked-starviper', ref: 'host' }];
  const g = scenario(p);
  let s = target(step(play(g.state, g.refs.source!), 'accept-effect'), g.refs.host!);
  blank(s, g.refs.source!);
  move(s, s.cards[g.refs.source!]!, 'hand');
  s = flush(s);
  expect(s.cards[g.refs.host!]!.controller).toBe('alice');
});
test('Death Star Plans transfers to the attacking player and makes that player choose a friendly new host', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'attacker' },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [{ card: 'death-star-plans', unit: 'host', ref: 'plans' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.attacker!, g.refs.host!);
  expect(s.cards[g.refs.plans!]!.controller).toBe('bob');
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.attacker!, g.refs.other!]);
  s = target(s, g.refs.other!);
  expect(s.cards[g.refs.plans!]!.attachedTo!.instanceId).toBe(g.refs.other!);
});
test('Each player can use Death Star Plans’ first-unit discount once in the same round', () => {
  const p = board('battlefield-marine');
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.players[1].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  p.players[1].hand = [
    { card: ids.marine, ref: 'bob-play' },
    { card: ids.marine, ref: 'bob-second' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.attachments = [{ card: 'death-star-plans', unit: 'host', ref: 'plans' }];
  const g = scenario(p);
  expect(playCost(g.state, g.state.cards[g.refs.source!]!)).toBe(0);
  let s = play(g.state, g.refs.source!);
  s = target(attack(s, g.refs.attacker!, g.refs.host!), g.refs.attacker!);
  expect(playCost(s, s.cards[g.refs['bob-play']!]!)).toBe(0);
  s = step(s, i => i.kind === 'use-ability' && i.card === s.players.alice!.leader);
  s = play(s, g.refs['bob-play']!);
  expect(playCost(s, s.cards[g.refs['bob-second']!]!)).toBe(2);
});
test('Sweep fixes two distinct legal targets in one arena before returning either', () => {
  const p = board('sweep-the-area');
  p.players[1].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.trooper, ref: 'second' },
    { card: ids.marine, ref: 'expensive' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'other-arena' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.first!);
  expect(s.cards[g.refs.first!]!.zone).toBe('ground');
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.second!]);
  s = target(s, g.refs.second!);
  expect(s.cards[g.refs.first!]!.zone).toBe('hand');
  expect(s.cards[g.refs.second!]!.zone).toBe('hand');
  expect(s.cards[g.refs['other-arena']!]!.zone).toBe('space');
});
for (const n of [0, 1])
  test(`Sweep can choose only ${n} unit`, () => {
    const p = board('sweep-the-area');
    p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    s = n ? target(s, g.refs.unit!) : step(s, 'decline-effect');
    if (s.execution.decision?.kind === 'effect') s = step(s, 'decline-effect');
    expect(s.cards[g.refs.unit!]!.zone).toBe(n ? 'hand' : 'ground');
  });
