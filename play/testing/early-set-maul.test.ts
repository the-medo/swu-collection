import { expect, test } from 'bun:test';
import { settle } from '../engine/advance.ts';
import { modifyUnit } from '../engine/lasting.ts';
import {
  attack,
  blank,
  board,
  choose,
  damage,
  effects,
  ids,
  play,
  resume,
  scenario,
  step,
  target,
  targets,
} from './early-set-completion-helpers.ts';
const maul = 'darth-maul--revenge-at-last';
function two(first: string = ids.marine, second: string = ids.marine) {
  const p = board(maul);
  p.players[1].ground = [
    { card: first, ref: 'one' },
    { card: second, ref: 'two' },
  ];
  return scenario(p);
}
test('Darth Maul attacks two units in one attack and deals full power to both, even if both defeat him', () => {
  const g = two();
  const pending = attack(g.state, g.refs.card!, g.refs.one!);
  expect(targets(pending)).toEqual([g.refs.two!]);
  expect(pending.phaseHistory.attacks).toHaveLength(0);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.two),
  );
  const s = target(pending, g.refs.two!);
  for (const ref of ['card', 'one', 'two']) expect(s.cards[g.refs[ref]!]!.zone).toBe('discard');
  expect(s.phaseHistory.attacks).toHaveLength(1);
  expect(s.facts.filter(f => f.type === 'attacked')).toHaveLength(1);
  expect(s.facts.filter(f => f.type === 'attack-ended')).toHaveLength(1);
});
test('Maul can attack one unit, cannot pair a base with a unit, and loses the option when blanked', () => {
  const g = two();
  const s = step(attack(g.state, g.refs.card!, g.refs.one!), 'decline-effect');
  expect(s.cards[g.refs.two!]!.damage).toBe(0);
  expect(s.cards[g.refs.card!]!.damage).toBe(3);
  const h = two();
  expect(damage(attack(h.state, h.refs.card!))).toBe(5);
  const j = two();
  blank(j.state, j.refs.card!);
  const t = attack(j.state, j.refs.card!, j.refs.one!);
  expect(t.execution.decision!.kind).toBe('action');
  expect(t.cards[j.refs.two!]!.damage).toBe(0);
});
test('both defenders must obey Sentinel; Saboteur permits other defenders and removes both sets of Shields', () => {
  const g = two('echo-base-defender');
  const s = attack(g.state, g.refs.card!, g.refs.one!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.two!]!.damage).toBe(0);
  const p = board(maul);
  p.players[1].ground = [
    { card: 'echo-base-defender', ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'one' },
    { card: 'shield', unit: 'two' },
  ];
  const h = scenario(p);
  modifyUnit(h.state, h.state.cards[h.refs.card!]!, h.state.cards[h.refs.card!]!, {
    kind: 'modify',
    power: 0,
    hp: 5,
    duration: 'phase',
    abilities: { keywords: ['Saboteur'] },
  });
  h.state.execution.decision = null;
  settle(h.state);
  const t = target(attack(h.state, h.refs.card!, h.refs.one!), h.refs.two!);
  expect(t.cards[h.refs.one!]!.zone).toBe('discard');
  expect(t.cards[h.refs.two!]!.zone).toBe('discard');
  expect(t.cards[h.refs.card!]!.damage).toBe(7);
});
test('On Attack occurs once and its reference to the defender applies to both units', () => {
  const p = board(maul);
  p.players[0].base.damage = 10;
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.attachments = [{ card: 'jedi-lightsaber', unit: 'card' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.card!]!, g.state.cards[g.refs.card!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { restore: 2 },
  });
  const s = target(attack(g.state, g.refs.card!, g.refs.one!), g.refs.two!);
  expect(damage(s, 'alice')).toBe(8);
  expect(s.cards[g.refs.card!]!.damage).toBe(2);
  expect(
    s.facts.filter(f => f.type === 'triggered' && f.cards.some(c => c.instanceId === g.refs.card)),
  ).toHaveLength(2);
});
test('attacker-first damage defeats both defenders before either can retaliate', () => {
  const g = two();
  modifyUnit(g.state, g.state.cards[g.refs.card!]!, g.state.cards[g.refs.card!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { firstCombatDamage: true },
  });
  const s = target(attack(g.state, g.refs.card!, g.refs.one!), g.refs.two!);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  expect(s.cards[g.refs.one!]!.zone).toBe('discard');
  expect(s.cards[g.refs.two!]!.zone).toBe('discard');
});
test('each Shield prevents only its own defender’s damage and Overwhelm includes the other defender', () => {
  const p = board(maul);
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: 'battle-droid', ref: 'two' },
  ];
  p.attachments = [{ card: 'shield', unit: 'one' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.card!]!, g.state.cards[g.refs.card!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Overwhelm'] },
  });
  const s = target(attack(g.state, g.refs.card!, g.refs.one!), g.refs.two!);
  expect(s.cards[g.refs.one!]!.damage).toBe(0);
  expect(damage(s)).toBe(4);
  expect(s.cards[g.refs.card!]!.damage).toBe(4);
});

test('combined Overwhelm damage is one packet before a base damage cap', () => {
  const p = board(maul);
  p.players[1].ground = [
    { card: 'battle-droid', ref: 'one' },
    { card: 'battle-droid', ref: 'two' },
    { card: 'at-attin-safety-droid' },
  ];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.card!]!, g.state.cards[g.refs.card!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Overwhelm'] },
  });
  const s = target(attack(g.state, g.refs.card!, g.refs.one!), g.refs.two!);
  expect(damage(s)).toBe(4);
  expect(
    s.facts.filter(f => f.type === 'damage' && f.cards.at(-1)?.instanceId === s.players.bob!.base),
  ).toHaveLength(1);
});
test('Wipe Them Out routes the combined excess to a third unit before the combat commits', () => {
  const p = board(maul);
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: ids.consular, ref: 'third' },
  ];
  p.players[0].hand = [{ card: 'wipe-them-out', ref: 'event' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.event!);
  s = attack(s, g.refs.card!, g.refs.one!);
  s = target(s, g.refs.two!);
  expect(targets(s)).not.toContain(g.refs.one!);
  expect(targets(s)).not.toContain(g.refs.two!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.third),
  );
  s = target(s, g.refs.third!);
  expect(s.cards[g.refs.third!]!.damage).toBe(4);
  expect(s.cards[g.refs.one!]!.zone).toBe('discard');
  expect(s.cards[g.refs.two!]!.zone).toBe('discard');
  expect(damage(s)).toBe(0);
});
test('a Shield on Maul prevents one defender’s damage while the other still damages him', () => {
  const p = board(maul);
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.attachments = [{ card: 'shield', unit: 'card' }];
  const g = scenario(p);
  const s = target(attack(g.state, g.refs.card!, g.refs.one!), g.refs.two!);
  expect(s.cards[g.refs.card!]!.zone).toBe('ground');
  expect(s.cards[g.refs.card!]!.damage).toBe(3);
});
test('Ambush can declare two defenders and resolves only one attack', () => {
  const p = board(maul, true);
  p.players[1].ground = [
    { card: 'battle-droid', ref: 'one' },
    { card: 'battle-droid', ref: 'two' },
  ];
  const g = scenario(p);
  let s = effects(g.state, [
    {
      kind: 'play-card',
      from: 'hand',
      filter: { name: 'Darth Maul' },
      free: true,
      optional: false,
      phaseAbilities: { keywords: ['Ambush'] },
    },
  ]);
  s = play(s, g.refs.card!);
  s = target(s, g.refs.one!);
  s = target(s, g.refs.two!);
  expect(s.phaseHistory.attacks).toHaveLength(1);
  expect(s.cards[g.refs.one!]!.zone).toBe('set-aside');
  expect(s.cards[g.refs.two!]!.zone).toBe('set-aside');
});
