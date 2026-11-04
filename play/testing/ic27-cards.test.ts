import { expect, test } from 'bun:test';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { playCost, startingHandSize } from '../engine/state.ts';
import {
  card,
  gameWith,
  step,
  target,
  play,
  attack,
  use,
  ordered,
  ids,
  resources,
  scenario,
} from './ic27-helpers.ts';
import type { GameState } from '../engine/model.ts';
const tokens = (s: GameState, id: string, name = 'experience') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === name).length;
const power = (s: GameState, id: string) => unitStats(s, s.cards[id]!).power;
const damage = (s: GameState, who = 'alice') => s.cards[s.players[who]!.base]!.damage;

// Expectations follow the pinned IC27 text and v8 6.2–6.4 / 7.6, not generated definitions.
test('Vader leader pays a sacrifice; deployed Vader offers a different friendly sacrifice', () => {
  const input = gameWith(1);
  input.players[0].base.damage = 5;
  input.players[0].ground = [{ card: ids.marine, ref: 'food' }];
  const g = scenario(input);
  const s = step(
    g.state,
    i =>
      i.kind === 'use-ability' &&
      i.card === g.refs.card &&
      i.abilityId === 'action' &&
      i.costTarget === g.refs.food,
  );
  expect(s.cards[g.refs.food!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(damage(s)).toBe(3);
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
});

test('Rey leader targets damaged units and grants Experience on either face', () => {
  for (const deployed of [false, true]) {
    const input = gameWith(2);
    input.players[0].leader.deployedAs = deployed ? 'unit' : undefined;
    input.players[0].ground = [
      { card: ids.consular, ref: 'hurt', damage: 1 },
      { card: ids.marine, ref: 'healthy' },
    ];
    const g = scenario(input);
    let s = deployed ? attack(g.state, g.refs.card!) : use(g.state, g.refs.card!);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === g.refs.healthy,
      ),
    ).toBe(false);
    s = target(s, g.refs.hurt!);
    expect(tokens(s, g.refs.hurt!)).toBe(1);
  }
});

test('Kylo discards for Experience and recovers only a unit when deployed', () => {
  const input = gameWith(3);
  input.players[0].hand = [{ card: ids.marine, ref: 'discard' }];
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  let s = use(g.state, g.refs.card!);
  s = step(s, 'accept-effect', [g.refs.discard!]);
  s = target(s, g.refs.unit!);
  expect(tokens(s, g.refs.unit!)).toBe(1);
  s = step(s, 'pass');
  s = use(s, g.refs.card!, 'deploy');
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(s.cards[g.refs.discard!]!.zone).toBe('hand');
});

test('Mace leader grants Restore for one attack and resources a card on deployment', () => {
  const input = gameWith(4);
  input.players[0].base.damage = 5;
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  let s = target(use(g.state, g.refs.card!), g.refs.unit!);
  s = attack(s, g.refs.unit!);
  expect(damage(s)).toBe(3);
  expect(effectiveAbilities(s, s.cards[g.refs.unit!]!).restore).toBe(0);
  s = step(s, 'pass');
  s = use(s, g.refs.card!, 'deploy');
  expect(s.players.alice!.resources).toHaveLength(21);
  expect(s.cards[s.players.alice!.resources.at(-1)!]!.exhausted).toBe(true);
});

test('Luke increases starting hand by two and discards for attack power only on his unit face', () => {
  const input = gameWith(6);
  input.players[0].leader.deployedAs = 'unit';
  input.players[0].hand = [{ card: ids.marine, ref: 'discard' }];
  const g = scenario(input);
  const setup = scenario(gameWith(6));
  expect(startingHandSize(setup.state, 'alice')).toBe(8);
  let s = attack(g.state, g.refs.card!);
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(damage(s, 'bob')).toBe(6);
  expect(power(s, g.refs.card!)).toBe(4);
});

test('Asajj leader only readies a resource after its chosen attacker survives', () => {
  for (const survives of [true, false]) {
    const input = gameWith(7);
    input.players[0].resources = [{ card: ids.marine, ref: 'resource', exhausted: true }];
    input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
    input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(input);
    let s = target(use(g.state, g.refs.card!), g.refs.unit!);
    s = attack(s, g.refs.unit!, survives ? s.players.bob!.base : g.refs.enemy!);
    if (survives) s = step(s, 'accept-effect', [g.refs.resource!]);
    expect(s.cards[g.refs.resource!]!.exhausted).toBe(!survives);
  }
});

test('Leia draws before choosing the exact hand card and top/bottom destination', () => {
  for (const destination of ['deck-top', 'deck-bottom']) {
    const g = scenario(gameWith(8));
    let s = use(g.state, g.refs.card!);
    const drawn = s.players.alice!.hand[0]!;
    s = step(s, 'accept-effect', [drawn]);
    s = step(s, i => i.kind === 'choose-mode' && i.mode === destination);
    expect(s.players.alice!.hand).toHaveLength(0);
    expect(
      destination === 'deck-top' ? s.players.alice!.deck[0] : s.players.alice!.deck.at(-1),
    ).toBe(drawn);
  }
});

test('Dryden grants Experience only to a friendly unit that survives his damage', () => {
  const input = gameWith(14, false);
  input.players[0].ground!.push({ card: ids.marine, ref: 'unit' });
  const g = scenario(input);
  const s = target(attack(g.state, g.refs.card!), g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.damage).toBe(1);
  expect(tokens(s, g.refs.unit!)).toBe(1);
});

test('Soulless One maintains its chosen ground power penalty only while its incarnation is in play', () => {
  const input = gameWith(19);
  input.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const g = scenario(input);
  const s = target(play(g.state, g.refs.card!), g.refs.unit!);
  expect(power(s, g.refs.unit!)).toBe(0);
});

test('Grievous chooses each upgrade benefit at most once in the phase', () => {
  const input = gameWith(21, false);
  input.players[0].base.damage = 5;
  input.players[0].hand = Array.from({ length: 4 }, (_, n) => ({
    card: 'academy-training',
    ref: `up${n}`,
  }));
  const g = scenario(input);
  let s = g.state;
  for (const [n, mode] of ['experience', 'heal', 'draw'].entries()) {
    s = step(s, i => i.kind === 'play' && i.card === g.refs[`up${n}`] && i.target === g.refs.card);
    expect(s.execution.decision!.options).toHaveLength(3 - n);
    s = step(s, i => i.kind === 'choose-mode' && i.mode === mode);
    s = step(s, 'pass');
  }
  s = step(s, i => i.kind === 'play' && i.card === g.refs.up3 && i.target === g.refs.card);
  expect(s.execution.decision!.kind).toBe('action');
  expect(tokens(s, g.refs.card!)).toBe(1);
  expect(damage(s)).toBe(2);
  expect(s.players.alice!.hand).toHaveLength(1);
});

test('Thrawn applies Experience and phase Sentinel on play', () => {
  const input = gameWith(24);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  const s = target(play(g.state, g.refs.card!), g.refs.unit!);
  expect(tokens(s, g.refs.unit!)).toBe(1);
  expect(effectiveAbilities(s, s.cards[g.refs.unit!]!).keywords).toContain('Sentinel');
});

test('Sidious deals only the amount actually healed from his controller’s base', () => {
  const input = gameWith(26, false);
  input.players[0].base.damage = 2;
  input.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const g = scenario(input);
  const s = target(attack(g.state, g.refs.card!), g.refs.unit!);
  expect(damage(s)).toBe(0);
  expect(s.cards[g.refs.unit!]!.damage).toBe(2);
});

test('Chimaera counts each unit’s existing upgrades for Experience, then heals for the resulting friendly upgrades', () => {
  const input = gameWith(29);
  input.players[0].base.damage = 10;
  input.players[0].ground = [{ card: ids.consular, ref: 'unit' }];
  input.attachments = [
    { card: 'experience', unit: 'unit' },
    { card: 'shield', unit: 'unit' },
  ];
  const g = scenario(input);
  const s = play(g.state, g.refs.card!);
  expect(tokens(s, g.refs.unit!)).toBe(3);
  // The chosen trigger order resolves the printed When Played before Shielded.
  expect(damage(s)).toBe(6);
  expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
});

test('BB-8 needs actual healing before its enemy damage', () => {
  for (const hurt of [0, 1]) {
    const input = gameWith(31, false);
    input.players[0].ground!.push({ card: ids.consular, ref: 'unit', damage: hurt });
    input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(input);
    let s = target(attack(g.state, g.refs.card!), g.refs.unit!);
    if (hurt) s = target(s, g.refs.enemy!);
    expect(s.cards[g.refs.unit!]!.damage).toBe(0);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(hurt);
  }
});

for (const [no, max] of [[39, 3]] as const)
  test(`${card(no)} defeats only units within its cost limit`, () => {
    const input = gameWith(no);
    input.players[1].ground = [
      { card: ids.marine, ref: 'small' },
      { card: ids.consular, ref: 'big' },
    ];
    const g = scenario(input);
    let s = play(g.state, g.refs.card!);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === g.refs.big,
      ),
    ).toBe(false);
    s = target(s, g.refs.small!);
    expect(s.cards[g.refs.small!]!.zone).toBe('discard');
  });

test('Rose gives her attack Shield to another Resistance unit, including an enemy', () => {
  const input = gameWith(40, false);
  input.players[1].ground = [{ card: card(32), ref: 'unit' }];
  const g = scenario(input);
  const s = target(attack(g.state, g.refs.card!, g.refs.unit!), g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(s.cards[g.refs.unit!]!.damage).toBe(0);
});

test('Qi’ra creates two Experience and transfers her departure token count', () => {
  const input = gameWith(45);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(input);
  let s = play(g.state, g.refs.card!);
  expect(tokens(s, g.refs.card!)).toBe(2);
  s = attack(s, g.refs.enemy!, g.refs.card!);
  s = target(s, g.refs.unit!);
  expect(tokens(s, g.refs.unit!)).toBe(2);
});

test('Pryde selects among the friendly units tied for most power', () => {
  const input = gameWith(56, false);
  input.players[0].ground!.push(
    { card: ids.consular, ref: 'strong' },
    { card: ids.fighter, ref: 'weak' },
  );
  input.players[0].ground = input.players[0].ground!.filter(c => c.ref !== 'weak');
  input.players[0].space = [{ card: ids.fighter, ref: 'weak' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!, g.refs.enemy!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.weak,
    ),
  ).toBe(false);
  s = target(s, g.refs.strong!);
  expect(tokens(s, g.refs.strong!)).toBe(1);
});

test('Krennic discounts a printed-cost-seven-or-less unit by two', () => {
  const input = gameWith(57, false);
  input.players[0].hand = [
    { card: ids.marine, ref: 'unit' },
    { card: card(67), ref: 'large' },
  ];
  const g = scenario(input);
  let s = use(g.state, g.refs.card!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.large,
    ),
  ).toBe(false);
  s = play(s, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(0);
});

test('Jabba grants the attacking unit four power only against his marked defender', () => {
  const input = gameWith(60, false);
  input.players[0].ground!.push({ card: ids.marine, ref: 'attacker' });
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(input);
  let s = target(use(g.state, g.refs.card!), g.refs.enemy!);
  s = step(s, 'pass');
  s = attack(s, g.refs.attacker!, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
});

test('Motti grants each other friendly Imperial Experience across both arenas', () => {
  const input = gameWith(62, false);
  input.players[0].space = [{ card: ids.fighter, ref: 'imperial' }];
  input.players[0].ground!.push({ card: ids.marine, ref: 'rebel' });
  const g = scenario(input);
  const s = attack(g.state, g.refs.card!);
  expect(tokens(s, g.refs.imperial!)).toBe(1);
  expect(tokens(s, g.refs.rebel!)).toBe(0);
  expect(tokens(s, g.refs.card!)).toBe(0);
});

test('The Silencer grants paid play permission when discarded from hand', () => {
  const input = gameWith(3);
  input.players[0].hand = [{ card: card(63), ref: 'silencer' }];
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  let s = use(g.state, g.refs.card!);
  s = step(s, 'accept-effect', [g.refs.silencer!]);
  s = target(s, g.refs.unit!);
  s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.silencer,
    ),
  ).toBe(true);
  const cost = playCost(s, s.cards[g.refs.silencer!]!);
  expect(cost).toBeGreaterThan(0);
  s = play(s, g.refs.silencer!);
  expect(s.cards[g.refs.silencer!]!.zone).toBe('space');
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(cost);
});

test('Talzin replays a small Villainy unit and takes its printed cost unless it is Night or Undead', () => {
  for (const [unit, cost] of [
    [card(58), 2],
    ['reanimated-night-trooper', 0],
  ] as const) {
    const input = gameWith(66);
    input.players[0].discard = [{ card: unit, ref: 'unit' }];
    const g = scenario(input);
    let s = play(g.state, g.refs.card!);
    s = play(s, g.refs.unit!);
    expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
    expect(s.cards[g.refs.card!]!.damage).toBe(cost);
  }
});

test('Devastator searches the top five and plays a Villainy unit for free', () => {
  const input = gameWith(68);
  input.players[0].deck = [{ card: card(58), ref: 'unit' }, ...resources(6)];
  const g = scenario(input);
  let s = play(g.state, g.refs.card!);
  const searchFrame = s.execution.frames[0]!;
  expect(searchFrame.kind).toBe('search');
  if (searchFrame.kind === 'search') expect(searchFrame.cards).toHaveLength(5);
  s = step(s, 'search', [g.refs.unit!]);
  s = play(s, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(s.players.alice!.deck).toHaveLength(6);
});

test('C-3PO checks the recipient’s power after giving Experience', () => {
  const input = gameWith(70, false);
  input.players[0].ground!.push({ card: card(81), ref: 'unit' });
  const g = scenario(input);
  const s = target(use(g.state, g.refs.card!), g.refs.unit!);
  expect(power(s, g.refs.unit!)).toBe(6);
  expect(s.players.alice!.hand).toHaveLength(1);
});

test('Mon Mothma attacks with another exhausted unit and Overwhelm, never a base directly', () => {
  const input = gameWith(77);
  input.players[0].ground = [{ card: card(121), ref: 'unit', exhausted: true }];
  input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(input);
  let s = target(play(g.state, g.refs.card!), g.refs.unit!);
  expect(
    s.execution.decision!.options.every(
      o => o.intent.kind !== 'attack' || o.intent.defender !== s.players.bob!.base,
    ),
  ).toBe(true);
  s = attack(s, g.refs.unit!, g.refs.enemy!);
  expect(damage(s, 'bob')).toBe(5);
});

test('Anakin’s discard presence waives Vader aspect penalties; the defeated trigger searches that title', () => {
  const input = gameWith(78, false);
  input.players[0].hand = [{ card: card(67), ref: 'vader' }];
  input.players[0].deck = [
    { card: card(1), ref: 'leader-vader' },
    { card: card(67), ref: 'found-vader' },
    ...resources(4),
  ];
  // Leaders cannot be deck cards in a legal scenario.
  input.players[0].deck = input.players[0].deck.filter(c => c.ref !== 'leader-vader');
  input.players[1].ground = [{ card: card(121), ref: 'enemy' }];
  const g = scenario(input);
  expect(playCost(g.state, g.state.cards[g.refs.vader!]!)).toBe(10);
  let s = attack(g.state, g.refs.card!, g.refs.enemy!);
  s = step(s, 'search', [g.refs['found-vader']!]);
  expect(s.cards[g.refs['found-vader']!]!.zone).toBe('hand');
  expect(playCost(s, s.cards[g.refs.vader!]!)).toBe(8);
});

test('Qui-Gon gives another friendly unit a phase +2/+2 bonus', () => {
  const input = gameWith(79);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  const s = target(play(g.state, g.refs.card!), g.refs.unit!);
  expect(unitStats(s, s.cards[g.refs.unit!]!)).toEqual({ power: 5, hp: 5 });
});

test('Mace’s attack Experience is applied before combat damage', () => {
  const g = scenario(gameWith(81, false));
  const s = attack(g.state, g.refs.card!);
  expect(damage(s, 'bob')).toBe(6);
  expect(tokens(s, g.refs.card!)).toBe(1);
});

test('Negotiator resources before offering a resource return, including the new resource', () => {
  const g = scenario(gameWith(84, false));
  const top = g.state.players.alice!.deck[0]!;
  let s = attack(g.state, g.refs.card!);
  expect(s.execution.decision!.selection!.cards).toContain(top);
  s = step(s, 'accept-effect', [top]);
  expect(s.cards[top]!.zone).toBe('hand');
  expect(s.players.alice!.resources).toHaveLength(20);
});

test('Issue a Command reveals/draws a unit, gives Experience, then resources itself exhausted', () => {
  const input = gameWith(87);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  const s = target(play(g.state, g.refs.card!), g.refs.unit!);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(tokens(s, g.refs.unit!)).toBe(1);
  expect(s.cards[g.refs.card!]!.zone).toBe('resources');
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
});

test('Eighth Brother can ready an Imperial controlled by either player', () => {
  const input = gameWith(99, false);
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  input.players[1].space = [{ card: ids.fighter, ref: 'imperial', exhausted: true }];
  const g = scenario(input);
  const s = target(attack(g.state, g.refs.card!, g.refs.enemy!), g.refs.imperial!);
  expect(s.cards[g.refs.imperial!]!.exhausted).toBe(false);
});

test('Inquisitor’s TIE collects both private discard choices before moving either card', () => {
  const input = gameWith(104, false);
  input.players[0].hand = resources(4);
  input.players[1].hand = resources(4);
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!);
  const own = s.players.alice!.hand[0]!,
    enemy = s.players.bob!.hand[0]!;
  s = step(s, 'accept-effect', [own]);
  expect(s.cards[own]!.zone).toBe('hand');
  expect(s.execution.decision!.playerId).toBe('bob');
  s = step(s, 'accept-effect', [enemy]);
  expect(s.cards[own]!.zone).toBe('discard');
  expect(s.cards[enemy]!.zone).toBe('discard');
});

test('Aurra deals four ability damage without attacking', () => {
  const input = gameWith(107, false);
  input.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const g = scenario(input);
  const s = target(use(g.state, g.refs.card!), g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.damage).toBe(4);
  expect(s.phaseHistory.attacks).toHaveLength(0);
});

test('Supremacy halves the chosen base’s remaining HP, rounding damage down', () => {
  const input = gameWith(110);
  input.players[1].base.damage = 9;
  const g = scenario(input);
  const s = target(play(g.state, g.refs.card!), g.state.players.bob!.base);
  expect(damage(s, 'bob')).toBe(19);
});

test('Ezra grants another Heroism unit Raid for the phase', () => {
  const input = gameWith(113, false);
  input.players[0].ground!.push({ card: ids.marine, ref: 'unit' });
  const g = scenario(input);
  let s = target(attack(g.state, g.refs.card!), g.refs.unit!);
  expect(damage(s, 'bob')).toBe(3);
  s = step(s, 'pass');
  s = attack(s, g.refs.unit!);
  expect(damage(s, 'bob')).toBe(8);
});

test('Poe reacts to another Resistance card being played', () => {
  const input = gameWith(115, false);
  input.players[0].hand = [{ card: card(32), ref: 'unit' }];
  const g = scenario(input);
  const s = play(g.state, g.refs.unit!);
  expect(power(s, g.refs.card!)).toBe(3);
});

test('Black One draws when played and when defeated', () => {
  const input = gameWith(116);
  input.players[1].space = [{ card: card(110), ref: 'enemy' }];
  const g = scenario(input);
  let s = play(g.state, g.refs.card!);
  expect(s.players.alice!.hand).toHaveLength(1);
  s = attack(s, g.refs.enemy!, g.refs.card!);
  expect(s.players.alice!.hand).toHaveLength(2);
});

test('Sabine mills the chosen deck and deals the difference between the two printed costs', () => {
  const input = gameWith(119);
  input.players[1].deck = [{ card: card(121) }, { card: ids.marine }];
  input.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const g = scenario(input);
  let s = play(g.state, g.refs.card!);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'enemy-deck');
  s = target(s, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.damage).toBe(4);
  expect(s.players.bob!.discard).toHaveLength(2);
});

test('Rey unit pays one and a discard to give the chosen attack +2 power', () => {
  const input = gameWith(120, false);
  input.players[0].hand = [{ card: ids.marine, ref: 'discard' }];
  input.players[0].ground!.push({ card: ids.marine, ref: 'unit' });
  const g = scenario(input);
  let s = use(g.state, g.refs.card!);
  s = step(s, 'accept-effect', [g.refs.discard!]);
  s = target(s, g.refs.unit!);
  s = attack(s, g.refs.unit!);
  expect(damage(s, 'bob')).toBe(5);
});

test('Ghost draws for friendly-unit base damage only while its hand has at most seven cards', () => {
  for (const size of [7, 8]) {
    const input = gameWith(122, false);
    input.players[0].hand = resources(size);
    const g = scenario(input);
    const s = attack(g.state, g.refs.card!);
    expect(s.players.alice!.hand).toHaveLength(8);
  }
});

test('Saw doubles another unit’s current power until the end of phase', () => {
  const input = gameWith(126, false);
  input.players[0].ground!.push({ card: ids.marine, ref: 'unit' });
  input.attachments = [{ card: 'experience', unit: 'unit' }];
  const g = scenario(input);
  const s = target(attack(g.state, g.refs.card!), g.refs.unit!);
  expect(power(s, g.refs.unit!)).toBe(8);
});

test('Vigilant Defense gives phase toughness and Sentinel, heals, then defeats an enemy with low remaining HP', () => {
  const input = gameWith(46);
  input.players[0].base.damage = 5;
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: 4 }];
  const g = scenario(input);
  let s = target(play(g.state, g.refs.card!), g.refs.unit!);
  s = target(s, s.players.alice!.base);
  s = target(s, g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.unit!]!).hp).toBe(6);
  expect(damage(s)).toBe(2);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
});

test('Act of Aggression draws, offers three damage, and grants phase power/Overwhelm', () => {
  const input = gameWith(127);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(input);
  let s = target(play(g.state, g.refs.card!), g.refs.enemy!);
  s = target(s, g.refs.unit!);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
  expect(power(s, g.refs.unit!)).toBe(6);
  expect(effectiveAbilities(s, s.cards[g.refs.unit!]!).keywords).toContain('Overwhelm');
});

test('Banshee may search for a non-unit and places it revealed on top without drawing', () => {
  const input = gameWith(138, false);
  input.players[0].deck = [{ card: card(127), ref: 'event' }, ...resources(5)];
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!);
  s = step(s, 'accept-effect');
  s = step(s, 'search', [g.refs.event!]);
  expect(s.players.alice!.deck[0]).toBe(g.refs.event);
  expect(s.players.alice!.hand).toHaveLength(0);
});

test('Wat Tambor’s optional play trigger attacks with a ready unit', () => {
  const input = gameWith(143);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(input);
  let s = target(play(g.state, g.refs.card!), g.refs.unit!);
  s = attack(s, g.refs.unit!);
  expect(damage(s, 'bob')).toBe(3);
  expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
});

test('Jango pays a discard before returning an event from the resulting discard pile', () => {
  const input = gameWith(144, false);
  input.players[0].hand = [{ card: card(127), ref: 'event' }];
  input.players[1].ground = [{ card: card(121), ref: 'enemy' }];
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!, g.refs.enemy!);
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [g.refs.event!]);
  s = step(s, 'accept-effect', [g.refs.event!]);
  expect(s.cards[g.refs.event!]!.zone).toBe('hand');
});

test('Poggle’s payment grants a single next-play reduction', () => {
  const input = gameWith(145, false);
  input.players[0].hand = [
    { card: ids.marine, ref: 'discard' },
    { card: card(79), ref: 'next' },
  ];
  const g = scenario(input);
  const before = playCost(g.state, g.state.cards[g.refs.next!]!);
  let s = attack(g.state, g.refs.card!);
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(playCost(s, s.cards[g.refs.next!]!)).toBe(before - 3);
});

test('Boba readies up to two resources only if this attack defeated its defender', () => {
  const input = gameWith(146, false);
  input.players[0].resources = [
    { card: ids.marine, ref: 'r1', exhausted: true },
    { card: ids.marine, ref: 'r2', exhausted: true },
  ];
  input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!, g.refs.enemy!);
  s = step(s, 'accept-effect', [g.refs.r1!, g.refs.r2!]);
  expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
});

test('Invisible Hand reduces the next card’s cost by nine', () => {
  const input = gameWith(149);
  input.players[0].hand!.push({ card: card(110), ref: 'next' });
  const g = scenario(input);
  const before = playCost(g.state, g.state.cards[g.refs.next!]!);
  const s = play(g.state, g.refs.card!);
  expect(playCost(s, s.cards[g.refs.next!]!)).toBe(Math.max(0, before - 9));
});

test('Mandalorian reduces an exhausted defender’s power for this attack only', () => {
  const input = gameWith(157, false);
  input.players[1].ground = [{ card: card(121), ref: 'enemy', exhausted: true }];
  const g = scenario(input);
  const s = attack(g.state, g.refs.card!, g.refs.enemy!);
  expect(s.cards[g.refs.card!]!.zone).toBe('discard'); // Eight power becomes four, still lethal.
  expect(power(s, g.refs.enemy!)).toBe(8);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(5);
});

test('Falcon pays to return and optionally replay an exact friendly low-cost unit', () => {
  const input = gameWith(158, false);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  input.attachments = [{ card: 'experience', unit: 'unit' }];
  const g = scenario(input);
  const old = g.state.cards[g.refs.unit!]!.incarnation;
  let s = attack(g.state, g.refs.card!);
  s = step(s, 'accept-effect');
  s = target(s, g.refs.unit!);
  s = play(s, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.incarnation).toBe(old + 1);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(tokens(s, g.refs.unit!)).toBe(0);
});

test('Leia exhausts up to two units in the chosen arena with combined printed cost at most four', () => {
  const input = gameWith(159);
  input.players[0].ground = [{ card: ids.marine, ref: 'a' }];
  input.players[1].ground = [
    { card: ids.marine, ref: 'b' },
    { card: ids.consular, ref: 'big' },
  ];
  input.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(input);
  let s = play(g.state, g.refs.card!);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'ground');
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.space!);
  expect(() => step(s, 'accept-effect', [g.refs.a!, g.refs.big!])).toThrow();
  s = step(s, 'accept-effect', [g.refs.a!, g.refs.b!]);
  expect(s.cards[g.refs.a!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.b!]!.exhausted).toBe(true);
});

test('Bo-Katan applies a phase power penalty to every enemy unit', () => {
  const input = gameWith(163);
  input.players[1].ground = [{ card: card(121), ref: 'a' }];
  input.players[1].space = [{ card: ids.fighter, ref: 'b' }];
  const g = scenario(input);
  const s = play(g.state, g.refs.card!);
  expect(power(s, g.refs.a!)).toBe(1);
  expect(power(s, g.refs.b!)).toBe(0);
  expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
});

test('Bad Feeling returns a non-leader before giving a friendly Shield', () => {
  const input = gameWith(166);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(input);
  let s = target(play(g.state, g.refs.card!), g.refs.enemy!);
  s = target(s, g.refs.unit!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('hand');
  expect(tokens(s, g.refs.unit!, 'shield')).toBe(1);
});

test('Lando returns three exact resources then optionally resources up to three hand cards exhausted', () => {
  const g = scenario(gameWith(167));
  const chosen = g.state.players.alice!.resources.slice(-3);
  let s = play(g.state, g.refs.card!);
  s = step(s, 'accept-effect', chosen);
  expect(s.players.alice!.resources).toHaveLength(17);
  expect(s.players.alice!.hand).toHaveLength(3);
  s = step(s, 'accept-effect', chosen.slice(0, 2));
  expect(s.players.alice!.resources).toHaveLength(19);
  expect(chosen.slice(0, 2).every(id => s.cards[id]!.exhausted)).toBe(true);
});

test('Cunning Ploy discards from the opponent’s hand, replaces it, exhausts, and attacks with +3', () => {
  const input = gameWith(168);
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  input.players[1].hand = [{ card: card(121), ref: 'discard' }];
  const g = scenario(input);
  let s = play(g.state, g.refs.card!);
  s = step(s, 'accept-effect', [g.refs.discard!]);
  s = target(s, g.refs.enemy!);
  s = target(s, g.refs.unit!);
  s = attack(s, g.refs.unit!);
  expect(s.cards[g.refs.discard!]!.zone).toBe('discard');
  expect(s.players.bob!.hand).toHaveLength(1);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(damage(s, 'bob')).toBe(6);
});

test('Jar Jar mills the top card and checks its printed cost for the attack bonus', () => {
  const input = gameWith(187, false);
  input.players[0].deck = [{ card: card(121), ref: 'milled' }];
  const g = scenario(input);
  const s = attack(g.state, g.refs.card!);
  expect(damage(s, 'bob')).toBe(5);
  expect(s.cards[g.refs.milled!]!.zone).toBe('discard');
  expect(power(s, g.refs.card!)).toBe(1);
});

test('IC27 auras affect only eligible friendly units and exclude their source where printed', () => {
  for (const [no, ally, stat, amount] of [
    [13, card(148), 'restore', 1],
    [23, card(32), 'hp', 1],
    [34, card(79), 'hp', 1],
    [67, ids.marine, 'Ambush', 1],
    [101, card(98), 'power', 1],
  ] as const) {
    const input = gameWith(no, false);
    input.players[0].ground ??= [];
    input.players[0].ground.push({ card: ally, ref: 'ally' });
    input.players[1].ground = [{ card: ally, ref: 'enemy' }];
    const g = scenario(input),
      s = g.state;
    const friendly = s.cards[g.refs.ally!]!,
      enemy = s.cards[g.refs.enemy!]!;
    if (stat === 'Ambush') {
      expect(effectiveAbilities(s, friendly).keywords).toContain('Ambush');
      expect(effectiveAbilities(s, enemy).keywords).not.toContain('Ambush');
    } else if (stat === 'restore') {
      expect(
        (effectiveAbilities(s, friendly).restore ?? 0) -
          (effectiveAbilities(s, enemy).restore ?? 0),
      ).toBe(amount);
      expect(effectiveAbilities(s, s.cards[g.refs.card!]!).restore).toBe(0);
    } else expect(unitStats(s, friendly)[stat] - unitStats(s, enemy)[stat]).toBe(amount);
    if (no === 101) expect(effectiveAbilities(s, friendly).keywords).toContain('Overwhelm');
  }
});

test('Finn needs an upgrade, Avar counts other friendly units, and Grand Inquisitor needs damage', () => {
  const input = gameWith(37, false);
  input.players[0].ground!.push(
    { card: card(71), ref: 'avar' },
    { card: card(248), ref: 'inquisitor' },
  );
  const g = scenario(input);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.card!]!).restore).toBe(0);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.avar!]!).raid).toBe(3);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.inquisitor!]!).keywords).not.toContain(
    'Saboteur',
  );
  input.attachments = [{ card: 'experience', unit: 'card' }];
  input.players[0].ground![2]!.damage = 1;
  const h = scenario(input);
  expect(effectiveAbilities(h.state, h.state.cards[h.refs.card!]!).restore).toBe(2);
  expect(effectiveAbilities(h.state, h.state.cards[h.refs.inquisitor!]!).raid).toBe(3);
  expect(effectiveAbilities(h.state, h.state.cards[h.refs.inquisitor!]!).keywords).toContain(
    'Saboteur',
  );
});

test('Enfys gets her attack bonus and Overwhelm only against a cheap unit', () => {
  for (const cheap of [true, false]) {
    const input = gameWith(86, false);
    input.players[1].ground = [{ card: cheap ? ids.marine : ids.consular, ref: 'enemy' }];
    const g = scenario(input);
    const s = attack(g.state, g.refs.card!, g.refs.enemy!);
    expect(damage(s, 'bob')).toBe(cheap ? 3 : 0);
    expect(power(s, g.refs.card!)).toBe(4);
    expect(effectiveAbilities(s, s.cards[g.refs.card!]!).keywords).not.toContain('Overwhelm');
  }
});

test('Moff Gideon discounts after a friendly defeat, but not after only an enemy defeat', () => {
  for (const friendly of [true, false]) {
    const input = gameWith(22);
    input.players[0].ground = [{ card: friendly ? ids.marine : ids.consular, ref: 'attacker' }];
    input.players[1].ground = [{ card: friendly ? ids.consular : ids.marine, ref: 'enemy' }];
    const g = scenario(input);
    const before = playCost(g.state, g.state.cards[g.refs.card!]!);
    const s = attack(g.state, g.refs.attacker!, g.refs.enemy!);
    expect(playCost(s, s.cards[g.refs.card!]!)).toBe(before - (friendly ? 2 : 0));
  }
});

test('Dexter pays to bottom selected cards and order the remainder without drawing', () => {
  const input = gameWith(49, false);
  input.players[0].deck = [ids.marine, ids.fighter, ids.consular, ids.trooper].map((c, n) => ({
    card: c,
    ref: `deck${n}`,
  }));
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!);
  s = step(s, 'accept-effect');
  expect(s.execution.frames[0]!.kind).toBe('arrange-deck');
  s = step(s, 'accept-effect', [g.refs.deck1!]);
  s = target(s, g.refs.deck2!);
  expect(s.players.alice!.deck).toEqual([
    g.refs.deck2!,
    g.refs.deck0!,
    g.refs.deck3!,
    g.refs.deck1!,
  ]);
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(1);
});

test('Vader’s deployed sacrifice excludes himself and heals only after a successful defeat', () => {
  const input = gameWith(1);
  input.players[0].leader.deployedAs = 'unit';
  input.players[0].base.damage = 3;
  input.players[0].ground = [{ card: ids.marine, ref: 'food' }];
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.card,
    ),
  ).toBe(false);
  s = target(s, g.refs.food!);
  expect(s.cards[g.refs.food!]!.zone).toBe('discard');
  expect(damage(s)).toBe(1);
  expect(s.players.alice!.hand).toHaveLength(1);
});

test('Asajj’s deployed On Attack readies a resource before combat', () => {
  const input = gameWith(7);
  input.players[0].leader.deployedAs = 'unit';
  input.players[0].resources = [{ card: ids.marine, exhausted: true, ref: 'resource' }];
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!);
  expect(damage(s, 'bob')).toBe(0);
  s = step(s, 'accept-effect', [g.refs.resource!]);
  expect(s.cards[g.refs.resource!]!.exhausted).toBe(false);
  expect(damage(s, 'bob')).toBe(5);
});

test('Leia’s deployed On Attack draws and tucks before combat', () => {
  const input = gameWith(8);
  input.players[0].leader.deployedAs = 'unit';
  const g = scenario(input);
  let s = attack(g.state, g.refs.card!);
  expect(damage(s, 'bob')).toBe(0);
  const drawn = s.players.alice!.hand[0]!;
  s = step(s, 'accept-effect', [drawn]);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'deck-bottom');
  expect(s.players.alice!.deck.at(-1)).toBe(drawn);
  expect(damage(s, 'bob')).toBe(4);
});

test('Silencer’s discard permission requires resources and expires before the next phase', () => {
  for (const canPay of [false, true]) {
    const input = gameWith(3);
    input.players[0].hand = [{ card: card(63), ref: 'silencer' }];
    input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
    if (!canPay) input.players[0].resources = [];
    const g = scenario(input);
    let s = use(g.state, g.refs.card!);
    s = step(s, 'accept-effect', [g.refs.silencer!]);
    s = target(s, g.refs.unit!);
    s = step(s, 'pass');
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'play' && o.intent.card === g.refs.silencer,
      ),
    ).toBe(canPay);
    s = step(s, 'pass');
    s = step(step(s, 'resource'), 'resource');
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'play' && o.intent.card === g.refs.silencer,
      ),
    ).toBe(false);
  }
});
