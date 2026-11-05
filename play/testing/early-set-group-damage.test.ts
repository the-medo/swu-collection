import { expect, test } from 'bun:test';
import {
  attack,
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
  tokens,
} from './early-set-completion-helpers.ts';

test('Dooku snapshots exploited power and chooses every target before dealing simultaneous damage', () => {
  const p = board('count-dooku--fallen-jedi', true);
  p.players[0].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.fighter, ref: 'second', movedArena: true },
  ];
  p.attachments = [{ card: 'academy-training', unit: 'first' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy1' },
    { card: ids.consular, ref: 'enemy2' },
  ];
  const g = scenario(p),
    powers = [stats(g.state, g.refs.first!).power, stats(g.state, g.refs.second!).power];
  let s = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.first!, g.refs.second!]);
  s = target(s, g.refs.enemy1!);
  expect(s.cards[g.refs.enemy1!]!.damage).toBe(0);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy2),
  );
  s = target(s, g.refs.enemy2!);
  expect(s.cards[g.refs.enemy1!]!.damage).toBe(powers[0]!);
  expect(s.cards[g.refs.enemy2!]!.damage).toBe(powers[1]!);
});
test('Dooku combines damage assigned to one unit into one Shield-prevented packet and permits individual declines', () => {
  const p = board('count-dooku--fallen-jedi', true);
  p.players[0].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy' }];
  const g = scenario(p);
  const pending = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.a!, g.refs.b!]);
  const s = target(target(pending, g.refs.enemy!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  expect(tokens(s, g.refs.enemy!, 'shield')).toBe(0);
  const skipped = step(step(pending, 'decline-effect'), 'decline-effect');
  expect(tokens(skipped, g.refs.enemy!, 'shield')).toBe(1);
});
test('Give In to Your Anger requires an ordinary unit attack before any other action', () => {
  const p = board('give-in-to-your-anger', true);
  p.players[0].ground = [{ card: ids.consular, ref: 'defender' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].hand = [{ card: ids.fighter }];
  const g = scenario(p),
    s = target(play(g.state, g.refs.card!), g.refs.attacker!);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'attack', attacker: g.refs.attacker!, defender: g.refs.defender! },
  ]);
  resume(
    s,
    choose(s, i => i.kind === 'attack'),
  );
  const t = attack(s, g.refs.attacker!, g.refs.defender!);
  expect(t.phaseHistory.requiredAttacks).toHaveLength(0);
});
test('Give In to Your Anger falls back to a base or permits other actions when the unit cannot attack', () => {
  for (const exhausted of [false, true]) {
    const p = board('give-in-to-your-anger', true);
    p.players[1].ground = [{ card: ids.consular, exhausted, ref: 'attacker' }];
    const g = scenario(p),
      s = target(play(g.state, g.refs.card!), g.refs.attacker!);
    if (exhausted) {
      expect(s.execution.decision!.options.some(o => o.intent.kind === 'pass')).toBe(true);
      expect(step(s, 'pass').phaseHistory.requiredAttacks).toHaveLength(0);
    } else
      expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
        { kind: 'attack', attacker: g.refs.attacker!, defender: s.players.alice!.base },
      ]);
  }
});
test('Give In to Your Anger respects Sentinel and does not demand an attack from a defeated unit', () => {
  const p = board('give-in-to-your-anger', true);
  p.players[0].ground = [
    { card: 'cell-block-guard', ref: 'sentinel' },
    { card: ids.consular, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  const g = scenario(p),
    s = target(play(g.state, g.refs.card!), g.refs.attacker!);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'attack', attacker: g.refs.attacker!, defender: g.refs.sentinel! },
  ]);
  const q = board('give-in-to-your-anger', true);
  q.players[1].ground = [{ card: 'battle-droid', ref: 'victim' }];
  const h = scenario(q),
    t = target(play(h.state, h.refs.card!), h.refs.victim!);
  expect(t.cards[h.refs.victim!]!.zone).toBe('set-aside');
  expect(t.execution.decision!.options.some(o => o.intent.kind === 'pass')).toBe(true);
});
