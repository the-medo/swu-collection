import { expect, test } from 'bun:test';
import { cannotReady } from '../engine/lasting.ts';
import { cardDefinition } from '../cards/registry.ts';
import {
  abilities,
  attack,
  board,
  choose,
  damage,
  defeat,
  effects,
  ids,
  play,
  position,
  resources,
  resume,
  scenario,
  stats,
  step,
  target,
  targets,
  tokens,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const readyResources = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
function event(id: string) {
  const p = board(id, true);
  p.players[0].ground = [{ card: ids.consular, ref: 'ally', damage: 2 }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy', damage: 2 },
    { card: ids.marine, ref: 'small' },
  ];
  return p;
}
for (const [id, power, hp, enemyOnly] of [
  ['tactical-advantage', 2, 2, false],
  ['make-an-opening', -2, -2, false],
  ['mystic-reflection', -2, 0, true],
] as const)
  test(`${id}: applies the printed phase modifier to the chosen unit`, () => {
    const p = event(id);
    p.players[0].base.damage = 4;
    const g = scenario(p),
      pending = play(g.state, g.refs.card!);
    expect(targets(pending).includes(g.refs.ally!)).toBe(!enemyOnly);
    const s = target(pending, g.refs.enemy!);
    expect(stats(s, g.refs.enemy!)).toEqual({ power: 3 + power, hp: 7 + hp });
    expect(stats(s, g.refs.ally!)).toEqual({ power: 3, hp: 7 });
    if (id === 'make-an-opening') expect(damage(s, 'alice')).toBe(2);
  });
for (const [id, friendly, dp, dh] of [
  ['encouraging-leadership', true, 1, 1],
  ['disruptive-burst', false, -1, -1],
  ['rallying-cry', true, 0, 0],
] as const)
  test(`${id}: affects only the specified controller’s units`, () => {
    const g = scenario(event(id)),
      s = play(g.state, g.refs.card!);
    expect(stats(s, g.refs.ally!)).toEqual({
      power: 3 + (friendly ? dp : 0),
      hp: 7 + (friendly ? dh : 0),
    });
    expect(stats(s, g.refs.enemy!)).toEqual({
      power: 3 + (friendly ? 0 : dp),
      hp: 7 + (friendly ? 0 : dh),
    });
    if (id === 'rallying-cry') {
      expect(abilities(s, g.refs.ally!).raid).toBe(2);
      expect(abilities(s, g.refs.enemy!).raid ?? 0).toBe(0);
    }
  });
for (const id of ['vanquish', 'takedown', 'death-by-droids'])
  test(`${id}: defeats its legal target and preserves other units`, () => {
    const p = event(id);
    p.players[1].leader.deployedAs = 'unit';
    const g = scenario(p),
      pending = play(g.state, g.refs.card!);
    expect(targets(pending)).toContain(g.refs.small!);
    if (id === 'vanquish' || id === 'death-by-droids')
      expect(targets(pending)).not.toContain(g.state.players.bob!.leader);
    const s = target(pending, g.refs.small!);
    expect(s.cards[g.refs.small!]!.zone).toBe('discard');
    expect(s.cards[g.refs.enemy!]!.zone).toBe('ground');
    if (id === 'death-by-droids')
      expect(
        Object.keys(s.cards)
          .filter(i => s.cards[i]!.zone === 'ground')
          .filter(i => s.cards[i]!.controller === 'alice' && s.cards[i]!.cardId === 'battle-droid'),
      ).toHaveLength(2);
  });
for (const id of ['waylay', 'evacuate', 'superlaser-blast'])
  test(`${id}: returns or defeats the printed eligible units`, () => {
    const p = event(id);
    p.players[1].leader.deployedAs = 'unit';
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    if (id === 'waylay') {
      expect(targets(s)).not.toContain(g.state.players.bob!.leader);
      s = target(s, g.refs.enemy!);
    }
    expect(s.cards[g.refs.enemy!]!.zone).toBe(id === 'superlaser-blast' ? 'discard' : 'hand');
    expect(s.cards[g.refs.ally!]!.zone).toBe(
      id === 'waylay' ? 'ground' : id === 'superlaser-blast' ? 'discard' : 'hand',
    );
    expect(s.cards[g.state.players.bob!.leader]!.zone).toBe(
      id === 'superlaser-blast' ? 'base' : 'ground',
    );
  });
for (const id of ['bravado', 'keep-fighting'])
  test(`${id}: readies an exhausted unit`, () => {
    const p = event(id);
    p.players[0].ground![0]!.exhausted = true;
    const g = scenario(p),
      s = target(play(g.state, g.refs.card!), g.refs.ally!);
    expect(s.cards[g.refs.ally!]!.exhausted).toBe(false);
  });
test('Covert Strength heals before adding Experience, and Grievous Reassembly creates a Droid', () => {
  for (const id of ['covert-strength', 'grievous-reassembly']) {
    const g = scenario(event(id)),
      s = target(play(g.state, g.refs.card!), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
    if (id === 'covert-strength') expect(tokens(s, g.refs.enemy!)).toBe(1);
    else
      expect(
        Object.keys(s.cards)
          .filter(i => s.cards[i]!.zone === 'ground')
          .some(i => s.cards[i]!.cardId === 'battle-droid' && s.cards[i]!.controller === 'alice'),
      ).toBe(true);
  }
});
test('Asteroid Sanctuary exhausts an enemy then shields only a cheap friendly unit', () => {
  const p = event('asteroid-sanctuary');
  p.players[0].ground!.push({ card: ids.marine, ref: 'cheap' });
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.enemy!);
  expect(pending.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(targets(pending)).toEqual([g.refs.cheap!]);
  expect(tokens(target(pending, g.refs.cheap!), g.refs.cheap!, 'shield')).toBe(1);
});
test('Creative Thinking excludes unique units and creates a Clone even with no exhaustible target', () => {
  const g = scenario(event('creative-thinking')),
    s = target(play(g.state, g.refs.card!), g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.exhausted).toBe(true);
  expect(
    Object.keys(s.cards)
      .filter(i => s.cards[i]!.zone === 'ground')
      .filter(i => s.cards[i]!.cardId === 'clone-trooper'),
  ).toHaveLength(1);
  const empty = scenario(board('creative-thinking', true)),
    done = play(empty.state, empty.refs.card!);
  expect(
    Object.keys(done.cards)
      .filter(i => done.cards[i]!.zone === 'ground')
      .filter(i => done.cards[i]!.cardId === 'clone-trooper'),
  ).toHaveLength(1);
});
for (const id of ['enforced-loyalty', 'self-destruct'])
  test(`${id}: follow-up requires defeating a friendly unit`, () => {
    const g = scenario(event(id));
    let s = target(play(g.state, g.refs.card!), g.refs.ally!);
    expect(s.cards[g.refs.ally!]!.zone).toBe('discard');
    if (id === 'enforced-loyalty') expect(s.players.alice!.hand).toHaveLength(2);
    else {
      s = target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.damage).toBe(6);
    }
    const empty = scenario(board(id, true)),
      noTarget = play(empty.state, empty.refs.card!);
    expect(noTarget.players.alice!.hand).toHaveLength(0);
    expect(damage(noTarget)).toBe(0);
  });
test('Force Choke draws for the target’s controller after lethal damage and excludes Vehicles', () => {
  const p = event('force-choke');
  p.players[1].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(targets(pending)).not.toContain(g.refs.vehicle!);
  const s = target(pending, g.refs.small!);
  expect(s.cards[g.refs.small!]!.zone).toBe('discard');
  expect(s.players.bob!.hand).toHaveLength(1);
  expect(s.players.alice!.hand).toHaveLength(0);
});
test('Force Lightning always blanks and only a Force unit enables additional damage payment', () => {
  for (const force of [false, true]) {
    const p = event('force-lightning');
    if (force)
      p.players[0].leader = { card: 'luke-skywalker--faithful-friend', deployedAs: 'unit' };
    const g = scenario(p);
    let s = target(play(g.state, g.refs.card!), g.refs.enemy!);
    if (force) {
      const paid = s.players.alice!.resources.filter(i => !s.cards[i]!.exhausted).slice(0, 2);
      resume(s, choose(s, 'accept-effect', paid));
      s = step(s, 'accept-effect', paid);
    }
    expect(s.cards[g.refs.enemy!]!.damage).toBe(force ? 6 : 2);
  }
});
test('Grenade Strike permits an optional different target in the first target’s arena after it dies', () => {
  const p = event('grenade-strike');
  p.players[1].ground!.push({ card: ids.trooper, ref: 'fragile' });
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    s = target(play(g.state, g.refs.card!), g.refs.fragile!);
  expect(s.cards[g.refs.fragile!]!.zone).toBe('discard');
  expect(targets(s)).not.toContain(g.refs.space!);
  expect(target(s, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(3);
  expect(step(s, 'decline-effect').cards[g.refs.enemy!]!.damage).toBe(2);
});
test('Guarding the Way grants Sentinel and checks initiative for the additional stats', () => {
  for (const holder of ['alice', 'bob']) {
    const p = event('guarding-the-way');
    p.initiative.holder = holder;
    const g = scenario(p),
      s = target(play(g.state, g.refs.card!), g.refs.ally!);
    expect(abilities(s, g.refs.ally!).keywords).toContain('Sentinel');
    expect(stats(s, g.refs.ally!).power).toBe(holder === 'alice' ? 5 : 3);
  }
});
test('In Pursuit requires an actual friendly exhaustion before exhausting the enemy', () => {
  const p = event('in-pursuit'),
    g = scenario(p),
    s = target(target(play(g.state, g.refs.card!), g.refs.ally!), g.refs.enemy!);
  expect(s.cards[g.refs.ally!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  p.players[0].ground![0]!.exhausted = true;
  const h = scenario(p),
    done = play(h.state, h.refs.card!);
  expect(done.cards[h.refs.enemy!]!.exhausted).toBe(false);
});
test('It Binds All Things deals only the amount actually healed and cannot hit the healed unit', () => {
  const p = event('it-binds-all-things');
  p.players[0].leader = { card: 'luke-skywalker--faithful-friend', deployedAs: 'unit' };
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.ally!);
  const s = step(pending, 'accept-effect', [g.refs.ally!, g.refs.ally!]);
  expect(s.cards[g.refs.ally!]!.damage).toBe(0);
  expect(targets(s)).not.toContain(g.refs.ally!);
  expect(target(s, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(4);
});
test('Look the Other Way gives the chosen unit’s controller the payment choice', () => {
  for (const pay of [false, true]) {
    const p = event('look-the-other-way');
    p.players[1].resources = resources(2);
    const g = scenario(p),
      pending = target(play(g.state, g.refs.card!), g.refs.enemy!);
    expect(pending.execution.decision!.playerId).toBe('bob');
    const s = step(pending, pay ? 'accept-effect' : 'decline-effect');
    expect(s.cards[g.refs.enemy!]!.exhausted).toBe(!pay);
    expect(s.players.bob!.resources.filter(i => s.cards[i]!.exhausted)).toHaveLength(pay ? 2 : 0);
  }
});
test('No Good to Me Dead prevents normal and regroup readying', () => {
  const g = scenario(event('no-good-to-me-dead')),
    s = target(play(g.state, g.refs.card!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(cannotReady(s, s.cards[g.refs.enemy!]!)).toBe(true);
  expect(cannotReady(s, s.cards[g.refs.enemy!]!, true)).toBe(true);
});
for (const id of ['outmaneuver', 'bombing-run'])
  test(`${id}: the arena choice includes both controllers`, () => {
    const p = event(id);
    p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
    const g = scenario(p),
      s = mode(play(g.state, g.refs.card!), 'ground');
    expect(s.cards[g.refs.space!]!.exhausted).toBe(false);
    expect(s.cards[g.refs.space!]!.damage).toBe(0);
    for (const ref of ['ally', 'enemy'])
      if (id === 'outmaneuver') expect(s.cards[g.refs[ref]!]!.exhausted).toBe(true);
      else expect(s.cards[g.refs[ref]!]!.damage).toBe(5);
  });
test('Manufactured Soldiers offers two Clones or three Droids; On the Doorstep readies its three Droids', () => {
  for (const [id, choice, token, n, ready] of [
    ['manufactured-soldiers', 'clones', 'clone-trooper', 2, false],
    ['manufactured-soldiers', 'droids', 'battle-droid', 3, false],
    ['on-the-doorstep', '', 'battle-droid', 3, true],
  ] as const) {
    const g = scenario(board(id, true));
    let s = play(g.state, g.refs.card!);
    if (choice) s = mode(s, choice);
    const cards = Object.keys(s.cards)
      .filter(i => s.cards[i]!.zone === 'ground')
      .map(i => s.cards[i]!)
      .filter(c => c.cardId === token);
    expect(cards).toHaveLength(n);
    expect(cards.every(c => c.exhausted === !ready)).toBe(true);
  }
});
