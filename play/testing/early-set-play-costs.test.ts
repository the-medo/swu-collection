import { expect, test } from 'bun:test';
import { playCost } from '../engine/state.ts';
import {
  abilities,
  board,
  choose,
  damage,
  effects,
  ids,
  play,
  resume,
  scenario,
  stats,
  step,
  target,
} from './early-set-completion-helpers.ts';
const mode = (s: Parameters<typeof step>[0], m: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === m);
function bamboozle() {
  const p = board('bamboozle', true);
  p.players[0].hand!.push({ card: 'waylay', ref: 'payment' });
  p.players[1].ground = [
    { card: ids.consular, ref: 'host' },
    { card: 'saw-gerrera--extremist', ref: 'saw' },
  ];
  p.attachments = [
    { card: 'academy-training', unit: 'host', owner: 'alice', ref: 'own-upgrade' },
    { card: 'academy-training', unit: 'host', ref: 'enemy-upgrade' },
  ];
  return p;
}
test('Bamboozle’s discarded Cunning card replaces resource, aspect and Saw’s additional costs', () => {
  const p = bamboozle();
  p.players[0].resources = [];
  const g = scenario(p);
  let s = mode(play(g.state, g.refs.card!), 'discard-instead');
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.payment!]);
  resume(s, choose(s, 'accept-effect', [g.refs.payment!]));
  s = target(step(s, 'accept-effect', [g.refs.payment!]), g.refs.host!);
  expect(damage(s, 'alice')).toBe(0);
  expect(s.cards[g.refs.payment!]!.zone).toBe('discard');
  expect(s.cards[g.refs.host!]!.exhausted).toBe(true);
  expect(s.players.alice!.hand).toContain(g.refs['own-upgrade']!);
  expect(s.players.bob!.hand).toContain(g.refs['enemy-upgrade']!);
});
test('Bamboozle may pay its normal costs, and cannot use itself as the discarded Cunning card', () => {
  const p = bamboozle(),
    g = scenario(p),
    expected = playCost(g.state, g.state.cards[g.refs.card!]!);
  const s = mode(play(g.state, g.refs.card!), 'pay-cost');
  expect(damage(s, 'alice')).toBe(2);
  expect(s.cards[g.refs.payment!]!.zone).toBe('hand');
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(expected);
  const q = board('bamboozle', true);
  q.players[0].resources = [];
  const h = scenario(q);
  expect(
    h.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === h.refs.card,
    ),
  ).toBe(false);
});
test('Bamboozle cannot replace its Smuggle cost with a discard', () => {
  const p = bamboozle();
  p.players[0].hand = p.players[0].hand!.filter(c => c.ref !== 'card');
  p.players[0].ground = [{ card: 'tech--source-of-insight' }];
  p.players[0].resources!.push({ card: 'bamboozle', ref: 'card' });
  const g = scenario(p),
    s = step(g.state, i => i.kind === 'play' && i.card === g.refs.card && !!i.smuggle);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'choose-mode' && o.intent.mode === 'discard-instead',
    ),
  ).toBe(false);
  expect(s.cards[g.refs.payment!]!.zone).toBe('hand');
  expect(damage(s, 'alice')).toBe(2);
});
test('Saw’s additional base damage is paid before the event resolves, including free event plays', () => {
  const p = board('resupply', true);
  p.players[1].ground = [{ card: 'saw-gerrera--extremist' }];
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(damage(s, 'alice')).toBe(2);
  expect(s.players.alice!.resources).toHaveLength(21);
  expect(s.facts.findIndex(f => f.type === 'damage')).toBeLessThan(
    s.facts.findIndex(f => f.type === 'played'),
  );
  const free = effects(g.state, [
    { kind: 'play-card', from: 'hand', filter: { kind: 'event' }, free: true, optional: false },
  ]);
  expect(damage(play(free, g.refs.card!), 'alice')).toBe(2);
});
test('Saw defeats the player before a lethal-cost event can resolve', () => {
  const p = board('resupply', true);
  p.players[0].base.damage = 28;
  p.players[1].ground = [{ card: 'saw-gerrera--extremist' }];
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(s.result).toEqual({ winner: 'bob', reason: 'base-defeat' });
  expect(s.players.alice!.resources).toHaveLength(20);
  expect(s.facts.some(f => f.type === 'played')).toBe(false);
});
function firstLight() {
  const p = board('first-light--headquarters-of-the-crimson-dawn', true);
  p.players[0].hand = [];
  p.players[0].resources!.push({
    card: 'first-light--headquarters-of-the-crimson-dawn',
    ref: 'ship',
  });
  p.players[0].ground = [{ card: ids.consular, ref: 'payment' }];
  return p;
}
test('First Light pays four damage before Smuggling and grants Grit only to other friendly nonleaders', () => {
  const p = firstLight();
  p.players[0].leader.deployedAs = 'unit';
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.ship && !!i.smuggle);
  expect(pending.execution.decision!.selection!.cards).not.toContain(g.refs.ship!);
  resume(pending, choose(pending, 'accept-effect', [g.refs.payment!]));
  const s = step(pending, 'accept-effect', [g.refs.payment!]);
  expect(s.cards[g.refs.payment!]!.damage).toBe(4);
  expect(s.cards[g.refs.ship!]!.zone).toBe('space');
  expect(abilities(s, g.refs.payment!).keywords).toContain('Grit');
  expect(abilities(s, s.players.alice!.leader).keywords).not.toContain('Grit');
  expect(s.facts.findIndex(f => f.type === 'damage')).toBeLessThan(
    s.facts.findIndex(f => f.type === 'played'),
  );
});
test('First Light’s additional damage cost can defeat its payment unit and can be replaced by a Shield', () => {
  const p = firstLight();
  p.players[0].ground = [{ card: ids.marine, ref: 'payment' }];
  const g = scenario(p);
  const s = step(
    step(g.state, i => i.kind === 'play' && i.card === g.refs.ship && !!i.smuggle),
    'accept-effect',
    [g.refs.payment!],
  );
  expect(s.cards[g.refs.payment!]!.zone).toBe('discard');
  expect(s.cards[g.refs.ship!]!.zone).toBe('space');
  const q = firstLight();
  q.attachments = [
    { card: 'shield', unit: 'payment', ref: 'one' },
    { card: 'shield', unit: 'payment', ref: 'two' },
  ];
  const h = scenario(q),
    pending = step(
      step(h.state, i => i.kind === 'play' && i.card === h.refs.ship && !!i.smuggle),
      'accept-effect',
      [h.refs.payment!],
    );
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === h.refs.one),
  );
  const shielded = target(pending, h.refs.one!);
  expect(shielded.cards[h.refs.payment!]!.damage).toBe(0);
  expect(shielded.cards[h.refs.ship!]!.zone).toBe('space');
});
test('First Light cannot Smuggle without another friendly unit and pays no damage when played from hand', () => {
  const p = firstLight();
  p.players[0].ground = [];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.ship,
    ),
  ).toBe(false);
  const q = board('first-light--headquarters-of-the-crimson-dawn', true),
    h = scenario(q),
    s = play(h.state, h.refs.card!);
  expect(s.cards[h.refs.card!]!.zone).toBe('space');
  expect(damage(s, 'alice')).toBe(0);
});
