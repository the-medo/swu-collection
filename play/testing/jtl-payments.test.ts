import { expect, test } from 'bun:test';
import { settle } from '../engine/advance.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { playCost, move, reference } from '../engine/state.ts';
import { isUnit } from '../engine/attachments.ts';
import { resourcePayment } from '../engine/resource-payment.ts';
import { playKeywordNames } from '../engine/play-keywords.ts';
import type { GameState } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import {
  board,
  play,
  mode,
  target,
  select,
  step,
  blank,
  nextOwn,
  ids,
  refresh,
  drain,
  options,
  tokens,
} from './jtl-helpers.ts';
const starhawk = 'the-starhawk--prototype-battleship',
  jump = 'jump-to-lightspeed';
function effects(s: GameState, e: CardEffect, source = s.cards[s.players.alice!.leader]!) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    { kind: 'effect', playerId: source.controller, source: structuredClone(source), effect: e },
    { kind: 'flush-triggers' },
  );
  settle(s);
  return drain(s);
}
const spent = (s: GameState) =>
  s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length;
function hawk(card = ids.marine as string, resources = 25) {
  const p = board(starhawk, false);
  p.players[0].hand = [{ card, ref: 'play' }];
  p.players[0].resources = Array.from({ length: resources }, () => ({ card: ids.marine }));
  return p;
}
test('The Starhawk pays its own full cost before entering, then halves later resource payments', () => {
  const p = board(starhawk);
  p.players[0].hand!.push({ card: ids.marine, ref: 'marine' });
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(spent(s)).toBe(9);
  s = play(nextOwn(s), g.refs.marine!);
  expect(spent(s)).toBe(10);
  expect(s.cards[g.refs.marine!]!.resourcesPaid).toBe(1);
});
test('The Starhawk leaves determined costs intact and rounds each payment up', () => {
  for (const [card, cost, payment] of [
    [ids.marine, 2, 1],
    ['open-fire', 3, 2],
    ['l3-37--get-out-of-my-seat', 5, 3],
  ] as const) {
    const g = scenario(hawk(card, payment));
    expect(playCost(g.state, g.state.cards[g.refs.play!]!)).toBe(cost);
    const s = play(g.state, g.refs.play!);
    expect(spent(s)).toBe(payment);
  }
  const g = scenario(hawk('open-fire', 1));
  expect(options(g.state).some(i => i.kind === 'play')).toBe(false);
});
test('The Starhawk applies after increases and discounts, and ability loss removes the payment benefit', () => {
  const g = scenario(hawk(ids.marine, 4));
  let s = effects(g.state, {
    kind: 'phase-play-cost',
    player: 'self',
    filter: { kind: 'unit' },
    increase: 3,
  });
  expect(playCost(s, s.cards[g.refs.play!]!)).toBe(5);
  s = play(s, g.refs.play!);
  expect(spent(s)).toBe(3);
  const b = scenario(hawk(ids.marine, 1));
  blank(b.state, b.refs.source!);
  refresh(b.state);
  expect(options(b.state).some(i => i.kind === 'play')).toBe(false);
  const c = scenario(hawk(ids.marine, 2));
  move(c.state, c.state.cards[c.refs.source!]!, 'hand');
  refresh(c.state);
  expect(resourcePayment(c.state, 'alice', 3)).toBe(3);
});
test('The Starhawk halves leader deployment payments while retaining resource-count requirements', () => {
  const p = hawk(ids.marine, 6);
  p.players[0].leader = { card: 'admiral-trench--chk-chk-chk-chk' };
  p.players[0].resources!.forEach((r, i) => (r.exhausted = i >= 2));
  const g = scenario(p);
  const s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(spent(s)).toBe(6);
  expect(s.cards[s.players.alice!.leader]!.deployedAs).toBe('unit');
  const q = hawk(ids.marine, 5);
  q.players[0].leader = p.players[0].leader;
  const low = step(scenario(q).state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(low.cards[low.players.alice!.leader]!.deployedAs).toBeNull();
});
test('The Starhawk halves optional ability costs but does not remove exhaust-self', () => {
  const g = scenario(hawk(ids.marine, 2));
  let s = effects(
    g.state,
    {
      kind: 'pay',
      costs: [{ kind: 'resources', amount: 3 }, { kind: 'exhaust-self' }],
      optional: true,
      effects: [{ kind: 'draw-cards', amount: 1 }],
    },
    g.state.cards[g.refs.source!]!,
  );
  s = step(s, 'accept-effect');
  expect(spent(s)).toBe(2);
  expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
  expect(s.players.alice!.hand).toHaveLength(2);
});
test('Credits pay the reduced resource requirement and remain optional', () => {
  const p = hawk(ids.marine, 0);
  p.players[0].credits = ['credit1', 'credit2'];
  const g = scenario(p);
  let s = play(g.state, g.refs.play!);
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  expect(s.execution.decision!.selection).toMatchObject({ min: 1, max: 1 });
  expect(decodeState(encodeState(s))).toEqual(s);
  s = select(s, g.refs.credit1!);
  expect(isUnit(s, s.cards[g.refs.play!]!)).toBe(true);
  expect(s.players.alice!.tokens).toContain(g.refs.credit2!);
  expect(spent(s)).toBe(0);
});
test('Exploit decreases the determined cost before The Starhawk halves the resulting payment', () => {
  const p = hawk('battle-droid-legion', 5);
  p.players[0].ground = [{ card: ids.marine, ref: 'sacrifice' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.play!);
  s = select(s, g.refs.sacrifice!);
  expect(spent(s)).toBe(5); // (9 + Villainy 2 - Exploit 2) / 2
  expect(s.cards[g.refs.play!]!.resourcesPaid).toBe(5);
});
test('Defeating The Starhawk with Exploit removes its payment benefit and rolls back an unaffordable play', () => {
  const g = scenario(hawk('battle-droid-legion', 5));
  let s = play(g.state, g.refs.play!);
  s = select(s, g.refs.source!);
  expect(s.cards[g.refs.play!]!.zone).toBe('hand');
  expect(isUnit(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(s.facts.some(f => f.type === 'play-cancelled')).toBe(true);
});
test('Each unit-tax payment is rounded separately', () => {
  const p = hawk(ids.marine, 3);
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  const g = scenario(p);
  let s = effects(g.state, { kind: 'tax-units', player: 'self', amount: 1 });
  s = select(s, g.refs.source!, g.refs.one!, g.refs.two!);
  expect(spent(s)).toBe(3);
  const q = hawk(ids.marine, 2);
  q.players[0].ground = p.players[0].ground;
  const h = scenario(q);
  const t = effects(h.state, { kind: 'tax-units', player: 'self', amount: 3 });
  expect(t.execution.decision!.selection!.max).toBe(1);
});
function jumping(resources = 25) {
  const p = board(jump);
  p.players[0].resources = Array.from({ length: resources }, () => ({ card: ids.marine }));
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'ship' }];
  return p;
}
function returnShip(g: ReturnType<typeof scenario>, upgrades: string[] = []) {
  let s = target(play(g.state, g.refs.source!), g.refs.ship!);
  return select(s, ...upgrades);
}
test('Jump to Lightspeed returns the chosen upgrades and host before checking lost HP, using original owners', () => {
  const p = jumping();
  p.players[0].space![0]!.damage = 8;
  p.attachments = [
    { card: 'academy-training', unit: 'ship', owner: 'bob', ref: 'upgrade' },
    { card: 'shield', unit: 'ship', ref: 'shield' },
  ];
  const g = scenario(p);
  const s = returnShip(g, [g.refs.upgrade!]);
  expect(s.cards[g.refs.ship!]!.zone).toBe('hand');
  expect(s.cards[g.refs.ship!]!.damage).toBe(0);
  expect(s.players.bob!.hand).toContain(g.refs.upgrade!);
  expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
  const old = s.departedUnits.find(d => d.reference.instanceId === g.refs.ship)!;
  expect(old.hp).toBe(9);
  expect(old.power).toBe(6);
  expect(old.upgrades).toHaveLength(2);
  expect(s.phaseHistory.defeated).toHaveLength(0);
});
test('Jump can return all attachments, including Pilot units, without causing defeat replacements', () => {
  const p = jumping();
  p.attachments = [{ card: 'luke-skywalker--you-still-with-me-', unit: 'ship', ref: 'luke' }];
  const g = scenario(p);
  const s = returnShip(g, [g.refs.luke!]);
  expect(s.cards[g.refs.luke!]!.zone).toBe('hand');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.facts.some(f => f.type === 'upgrade-defeat-replaced')).toBe(false);
});
test('An unreturned Luke gets his defeat replacement after the ship leaves', () => {
  const p = jumping();
  p.attachments = [{ card: 'luke-skywalker--you-still-with-me-', unit: 'ship', ref: 'luke' }];
  const g = scenario(p);
  let s = returnShip(g);
  expect(s.cards[g.refs.ship!]!.zone).toBe('hand');
  expect(s.execution.frames[0]!.kind).toBe('upgrade-defeat');
  s = step(s, 'accept-effect');
  expect(isUnit(s, s.cards[g.refs.luke!]!)).toBe(true);
});
test('Jump offers free play with zero ready resources, then consumes the matching grant', () => {
  const g = scenario(jumping(4));
  let s = returnShip(g);
  s = play(nextOwn(s), g.refs.ship!);
  expect(s.execution.frames[0]!.kind).toBe('free-play-choice');
  expect(options(s)).toEqual([
    { kind: 'choose-mode', mode: 'play-for-free' },
    { kind: 'decline-effect' },
  ]);
  expect(decodeState(encodeState(s))).toEqual(s);
  s = mode(s, 'play-for-free');
  expect(isUnit(s, s.cards[g.refs.ship!]!)).toBe(true);
  expect(s.cards[g.refs.ship!]!.resourcesPaid).toBe(0);
  expect(s.playModifiers).toHaveLength(0);
});
test('Jump’s next copy may be a different physical card, and the player can pay its normal cost', () => {
  const p = jumping();
  p.players[0].hand!.push({ card: 'munificent-frigate', ref: 'copy' });
  const g = scenario(p);
  let s = returnShip(g);
  s = play(nextOwn(s), g.refs.copy!);
  expect(options(s)).toContainEqual({ kind: 'choose-mode', mode: 'pay-cost' });
  s = mode(s, 'pay-cost');
  expect(s.cards[g.refs.copy!]!.resourcesPaid).toBe(7);
  expect(s.cards[g.refs.ship!]!.zone).toBe('hand');
  expect(s.playModifiers).toHaveLength(0);
});
test('Cancelling the free-play choice restores declaration and keeps the grant for a later play', () => {
  const g = scenario(jumping());
  let s = play(nextOwn(returnShip(g)), g.refs.ship!);
  s = step(s, 'decline-effect');
  expect(s.cards[g.refs.ship!]!.zone).toBe('hand');
  expect(s.playModifiers).toHaveLength(1);
  s = mode(play(s, g.refs.ship!), 'play-for-free');
  expect(isUnit(s, s.cards[g.refs.ship!]!)).toBe(true);
});
test('Jump’s free grant expires at the end of the phase and ignores unrelated plays', () => {
  const p = jumping();
  p.players[0].hand!.push({ card: ids.marine, ref: 'other' });
  const g = scenario(p);
  let s = returnShip(g);
  s = play(nextOwn(s), g.refs.other!);
  expect(s.cards[g.refs.other!]!.resourcesPaid).toBe(2);
  expect(s.playModifiers).toHaveLength(1);
  s = step(s, 'pass');
  s = step(s, 'pass');
  expect(s.playModifiers).toHaveLength(0);
});
test('A free copy can still use Exploit to defeat a friendly unit', () => {
  const p = jumping();
  p.players[0].space = [{ card: 'battle-droid-legion', ref: 'ship', movedArena: true }];
  p.players[0].ground = [{ card: ids.marine, ref: 'sacrifice' }];
  const g = scenario(p);
  let s = play(nextOwn(returnShip(g)), g.refs.ship!);
  s = mode(s, 'play-for-free');
  expect(s.execution.frames[0]!.kind).toBe('exploit-payment');
  expect(decodeState(encodeState(s))).toEqual(s);
  s = select(s, g.refs.sacrifice!);
  expect(s.cards[g.refs.sacrifice!]!.zone).toBe('discard');
  expect(s.cards[g.refs.ship!]!.resourcesPaid).toBe(0);
  expect(s.cards[g.refs.ship!]!.zone).toBe('ground');
});
test('Yularen’s errata grants the chosen keyword during a Vehicle play declaration', () => {
  const p = board('admiral-yularen--fleet-coordinator');
  p.players[0].hand!.push({ card: 'munificent-frigate', ref: 'ship' });
  const g = scenario(p);
  const s = mode(play(g.state, g.refs.source!), 'shielded');
  expect(playKeywordNames(s, s.cards[g.refs.ship!]!, true)).toContain('Shielded');
  expect(playKeywordNames(s, s.cards[g.refs.ship!]!, false)).not.toContain('Shielded');
});
test('Droid alternative payments satisfy the reduced amount without spending extra resources', () => {
  const p = hawk(ids.marine, 0);
  p.players[0].space!.push({ card: 'vuutun-palaa--droid-control-ship', ref: 'vuutun' });
  p.players[0].ground = [{ card: 'battle-droid', ref: 'droid' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.play!);
  expect(s.execution.decision!.selection!.max).toBe(1);
  s = select(s, g.refs.droid!);
  expect(s.cards[g.refs.droid!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.play!]!.resourcesPaid).toBe(1);
});
test('Jump excludes leader upgrades and defeats an unreturned deployed leader when the ship leaves', () => {
  const p = jumping();
  p.players[0].leader = {
    card: 'luke-skywalker--hero-of-yavin',
    deployedAs: 'upgrade',
    attachedTo: 'ship',
    ref: 'leader',
  };
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.ship!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.leader!);
  s = select(s);
  expect(s.cards[g.refs.leader!]!.zone).toBe('base');
  expect(s.cards[g.refs.leader!]!.deployedAs).toBeNull();
});
test('Returning a leader unit defeats it instead and retains the selected upgrade’s When Defeated grant', () => {
  const p = board(jump);
  p.players[0].leader = { card: ids.leader, deployedAs: 'unit', ref: 'ship' };
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'grim-valor', unit: 'ship', ref: 'upgrade' }];
  const g = scenario(p);
  move(g.state, g.state.cards[g.refs.ship!]!, 'space');
  refresh(g.state);
  let s = returnShip(g, [g.refs.upgrade!]);
  expect(s.cards[g.refs.ship!]!.zone).toBe('base');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('hand');
  expect(decodeState(encodeState(s))).toEqual(s);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});
test('The Starhawk remains effective when Jump’s free-play offer is declined in favor of normal payment', () => {
  const p = jumping();
  p.players[0].space!.push({ card: starhawk, ref: 'hawk' });
  const g = scenario(p);
  let s = returnShip(g);
  s = mode(play(nextOwn(s), g.refs.ship!), 'pay-cost');
  expect(s.cards[g.refs.ship!]!.resourcesPaid).toBe(4);
});
test('Jump’s free copy still triggers The Starhawk’s Ambush', () => {
  const p = jumping();
  p.players[0].space = [{ card: starhawk, ref: 'ship' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p);
  let s = mode(play(nextOwn(returnShip(g)), g.refs.ship!), 'play-for-free');
  expect(options(s).some(i => i.kind === 'target' && i.card === g.refs.enemy!)).toBe(true);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.ship!]!.resourcesPaid).toBe(0);
});
