import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { cardDefinition } from '../cards/registry.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const raw = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) => advance(s, choose(s, p, selection)).state;
function ordered(s: GameState): GameState {
  while (s.execution.decision?.kind === 'trigger') s = raw(s, 'trigger');
  return s;
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) => ordered(raw(s, p, selection));
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const tokens = (s: GameState, id: string, kind = 'advantage') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === kind).length;
function board(card: string, inHand = true) {
  const p = position();
  const d = cardDefinition(card);
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  if (inHand) p.players[0].hand = [{ card, ref: 'source' }];
  else if (d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else throw Error('Unit required');
  return p;
}
for (const [card, count] of [
  ['ferry-droid', 4],
  ['zealous-soldier', 1],
] as const)
  test(`${card} creates its printed number of Advantages on its own copy`, () => {
    const { state, refs } = scenario(board(card));
    const s = step(state, 'play');
    expect(tokens(s, refs.source!)).toBe(count);
  });
test('Helix Starfighter checks enemy space control; friendly space units do not count', () => {
  for (const enemy of [true, false]) {
    const p = board('helix-starfighter');
    p.players[enemy ? 1 : 0].space = [{ card: ids.fighter }];
    const { state, refs } = scenario(p);
    const s = step(state, 'play');
    expect(tokens(s, refs.source!, 'shield')).toBe(enemy ? 1 : 0);
    expect(tokens(s, refs.source!)).toBe(enemy ? 0 : 2);
  }
});
test('Knobby White Ice Spider counts both enemy arenas and excludes friendly units', () => {
  const p = board('knobby-white-ice-spider');
  p.players[0].ground = [{ card: ids.marine }];
  p.players[1].ground = [{ card: ids.marine }, { card: ids.marine }];
  p.players[1].space = [{ card: ids.fighter }];
  const { state, refs } = scenario(p);
  expect(tokens(step(state, 'play'), refs.source!)).toBe(3);
});
for (const [card, max, exhausted] of [
  ['a-new-order', 2, false],
  ['inspiring-veteran', 3, true],
] as const)
  test(`${card} assigns tokens to distinct eligible units up to its limit`, () => {
    const p = board(card);
    p.players[0].ground = [
      { card: ids.marine, ref: 'a', exhausted },
      { card: ids.marine, ref: 'b', exhausted },
    ];
    p.players[1].ground = [
      { card: ids.marine, ref: 'c', exhausted },
      { card: ids.marine, ref: 'ineligible', exhausted: false },
    ];
    const { state, refs } = scenario(p);
    let s = step(state, 'play');
    expect(s.execution.decision!.selection!.max).toBe(max);
    if (exhausted) expect(s.execution.decision!.selection!.cards).not.toContain(refs.ineligible!);
    s = step(s, 'accept-effect', [refs.a!, refs.c!]);
    expect(tokens(s, refs.a!)).toBe(1);
    expect(tokens(s, refs.b!)).toBe(0);
    expect(tokens(s, refs.c!)).toBe(1);
  });
for (const [card, filter, amount, kind] of [
  ['attendant-navigator', 'space', 2, 'advantage'],
  ['trexler-armored-marauder', 'ground', 1, 'shield'],
] as const)
  test(`${card} may grant its token to a legal friendly or enemy unit`, () => {
    const p = board(card);
    p.players[1][filter] = [{ card: filter === 'space' ? ids.fighter : ids.marine, ref: 'target' }];
    const { state, refs } = scenario(p);
    const choice = step(state, 'play');
    expect(choice.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
      true,
    );
    expect(tokens(target(choice, refs.target!), refs.target!, kind)).toBe(amount);
    expect(tokens(step(choice, 'decline-effect'), refs.target!, kind)).toBe(0);
  });
for (const card of ['amnesty-officer', 'reinforcing-light-cruiser'])
  test(`${card} exhausts a chosen unit and allows declining`, () => {
    const p = board(card);
    p.players[1].ground = [
      { card: 'imperial-loyalist', ref: 'target' },
      { card: ids.marine, ref: 'vanilla' },
    ];
    const { state, refs } = scenario(p);
    const s = step(state, 'play');
    if (card === 'amnesty-officer')
      expect(
        s.execution.decision!.options.some(
          o => o.intent.kind === 'target' && o.intent.card === refs.vanilla,
        ),
      ).toBe(false);
    expect(target(s, refs.target!).cards[refs.target!]!.exhausted).toBe(true);
    expect(step(s, 'decline-effect').cards[refs.target!]!.exhausted).toBe(false);
  });
for (const [card, amount] of [
  ['lep-ratcatcher', 1],
  ['desert-sharpshooter', 2],
  ['imposing-scout-walker', 3],
  ['starfortress-heavy-bomber', 6],
] as const)
  test(`${card} deals its damage only to an eligible ground unit`, () => {
    const p = board(card);
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
    if (card === 'desert-sharpshooter') p.attachments = [{ card: 'experience', unit: 'target' }];
    const { state, refs } = scenario(p);
    let s = step(state, 'play');
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === refs.space,
      ),
    ).toBe(false);
    s = target(s, refs.target!);
    expect(s.cards[refs.target!]!.damage).toBe(amount);
    if (card === 'imposing-scout-walker') expect(tokens(s, refs.source!)).toBe(0);
  });
test('Imposing Scout Walker awards tokens only when its selected victim is defeated', () => {
  const p = board('imposing-scout-walker');
  p.players[1].ground = [{ card: ids.trooper, ref: 'target' }];
  const { state, refs } = scenario(p);
  expect(tokens(target(step(state, 'play'), refs.target!), refs.source!)).toBe(3);
});
for (const [card, count] of [
  ['children-of-the-watch', 2],
  ['buy-time', 1],
  ['foundling-rescue', 1],
] as const)
  test(`${card} creates Mandalorians, including when Foundling Rescue is declined`, () => {
    const p = board(card);
    if (card === 'foundling-rescue') p.players[1].ground = [{ card: ids.trooper }];
    const { state } = scenario(p);
    let s = step(state, 'play');
    if (card === 'foundling-rescue') s = step(s, 'decline-effect');
    const created = Object.values(s.cards).filter(
      c => c.zone === 'ground' && c.cardId === 'mandalorian',
    );
    expect(created).toHaveLength(count);
    if (card === 'buy-time')
      expect(effectiveAbilities(s, created[0]!).keywords).toContain('Sentinel');
  });
for (const card of ['covert-believers', 'duchess-s-protector'])
  test(`${card} creates a Mandalorian after its defeat`, () => {
    const p = board(card, false);
    p.activePlayer = 'bob';
    p.players[1].ground = [{ card: 'scorpenek-annihilator-droid', ref: 'attacker' }];
    p.players[0].ground![0]!.damage = card === 'covert-believers' ? 3 : 1;
    const { state, refs } = scenario(p);
    const s = attack(state, refs.attacker!, refs.source!);
    expect(s.cards[refs.source!]!.zone).toBe('discard');
    expect(
      Object.values(s.cards).filter(
        c => c.zone === 'ground' && c.cardId === 'mandalorian' && c.controller === 'alice',
      ),
    ).toHaveLength(1);
  });
test('Warrior’s Legacy still creates its token when its host and attachment leave play', () => {
  const p = board(ids.trooper, false);
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.attachments = [{ card: 'warrior-s-legacy', unit: 'source', ref: 'upgrade' }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.attacker!, refs.source!);
  expect(s.cards[refs.upgrade!]!.zone).toBe('discard');
  expect(
    Object.values(s.cards).some(
      c => c.zone === 'ground' && c.cardId === 'mandalorian' && c.controller === 'alice',
    ),
  ).toBe(true);
});
test('Display of Strength and Perseverance modify only the selected copy', () => {
  for (const card of ['display-of-strength', 'perseverance']) {
    const p = board(card);
    p.players[0].ground = [
      { card: ids.consular, ref: 'a', damage: 3 },
      { card: ids.consular, ref: 'b', damage: 3 },
    ];
    const { state, refs } = scenario(p);
    const s = target(step(state, 'play'), refs.a!);
    expect(s.cards[refs.b!]!.damage).toBe(3);
    if (card === 'perseverance') {
      expect(s.cards[refs.a!]!.damage).toBe(0);
      expect(tokens(s, refs.a!, 'shield')).toBe(1);
    } else expect(unitStats(s, s.cards[refs.a!]!)).toMatchObject({ power: 6, hp: 10 });
  }
});
test('Keep Them Talking excludes costly units and permits choosing none', () => {
  const p = board('keep-them-talking');
  p.players[1].ground = [
    { card: ids.marine, ref: 'cheap' },
    { card: ids.consular, ref: 'costly' },
  ];
  const { state, refs } = scenario(p);
  const s = step(state, 'play');
  expect(s.execution.decision!.selection!.cards).toContain(refs.cheap!);
  expect(s.execution.decision!.selection!.cards).not.toContain(refs.costly!);
  expect(step(s, 'accept-effect', []).cards[refs.cheap!]!.exhausted).toBe(false);
  expect(step(s, 'accept-effect', [refs.cheap!]).cards[refs.cheap!]!.exhausted).toBe(true);
});
test('Turning the Tide counts all friendly units, not attachments or enemy units', () => {
  const p = board('turning-the-tide');
  p.players[0].ground = [{ card: ids.marine }, { card: ids.marine }];
  p.players[0].space = [{ card: ids.fighter }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const { state, refs } = scenario(p);
  expect(target(step(state, 'play'), refs.target!).cards[refs.target!]!.damage).toBe(3);
});
test('The Student Guides the Master compares powers before its one-time modifier', () => {
  const p = board('the-student-guides-the-master');
  p.players[0].ground = [
    { card: ids.consular, ref: 'target' },
    { card: ids.trooper },
    { card: 'noti-nomad' },
  ];
  p.players[0].space = [{ card: ids.fighter }];
  const { state, refs } = scenario(p);
  const s = target(step(state, 'play'), refs.target!);
  expect(unitStats(s, s.cards[refs.target!]!).power).toBe(5);
});
test('Intimidation requires four power when it resolves', () => {
  for (const strong of [false, true]) {
    const p = board('intimidation');
    p.players[0].ground = [{ card: strong ? 'wookiee-chieftain' : ids.marine }];
    const { state } = scenario(p);
    expect(step(state, 'play').players.alice!.hand).toHaveLength(strong ? 2 : 0);
  }
});
test('Lang uses his modified power for damage and pays exhaustion', () => {
  const p = board('lang--arrogant-mercenary', false);
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  p.attachments = [{ card: 'experience', unit: 'source' }];
  const { state, refs } = scenario(p);
  const power = unitStats(state, state.cards[refs.source!]!).power;
  const s = target(
    step(state, i => i.kind === 'use-ability' && i.card === refs.source),
    refs.target!,
  );
  expect(s.cards[refs.source!]!.exhausted).toBe(true);
  expect(s.cards[refs.target!]!.damage).toBe(power);
});
test('Mortar Trooper deals one simultaneous damage to up to three distinct ground units', () => {
  const p = board('mortar-trooper', false);
  p.players[1].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'use-ability' && i.card === refs.source);
  expect(s.execution.decision!.selection!.cards).not.toContain(refs.space!);
  s = step(s, 'accept-effect', [refs.a!, refs.b!]);
  expect(s.cards[refs.a!]!.damage).toBe(1);
  expect(s.cards[refs.b!]!.damage).toBe(1);
  expect(s.cards[refs.source!]!.exhausted).toBe(true);
});
test('Emperor’s Messenger lends resource readying through Support', () => {
  const p = board('emperor-s-messenger');
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  const { state, refs } = scenario(p);
  let s = attack(step(state, 'play'), refs.attacker!, state.players.bob!.base);
  const readyBefore = s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
  s = step(s, 'accept-effect', [s.execution.decision!.selection!.cards[0]!]);
  expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted)).toHaveLength(
    readyBefore + 1,
  );
});
test('Follow Me gives its tokens after the attack, so they cannot increase that attack’s damage', () => {
  const p = board('follow-me');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  const { state, refs } = scenario(p);
  let s = target(step(state, 'play'), refs.attacker!);
  s = attack(s, refs.attacker!, state.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  s = target(s, refs.attacker!);
  expect(tokens(s, refs.attacker!)).toBe(3);
});
test('Rash Action discards only after this attack deals combat damage to the enemy base', () => {
  for (const base of [false, true]) {
    const p = board('rash-action');
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
    p.players[1].hand = [{ card: ids.marine, ref: 'discard' }];
    const { state, refs } = scenario(p);
    let s = attack(
      step(state, 'play'),
      refs.attacker!,
      base ? state.players.bob!.base : refs.defender!,
    );
    if (base) {
      expect(s.execution.decision!.playerId).toBe('bob');
      s = step(s, 'accept-effect', [refs.discard!]);
    }
    expect(s.players.bob!.hand).toHaveLength(base ? 0 : 1);
    expect(s.cards[base ? s.players.bob!.base : refs.defender!]!.damage).toBe(4);
  }
});
for (const card of ['rukh--from-the-shadows', 'grand-admiral-thrawn--orchestrating-his-return'])
  test(`${card} lends its defeated-defender attack-end reward through Support`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
    const { state, refs } = scenario(p);
    let s = attack(step(state, 'play'), refs.attacker!, refs.defender!);
    if (card.startsWith('rukh')) {
      s = target(s, refs.attacker!);
      expect(tokens(s, refs.attacker!)).toBe(3);
    } else expect(s.cards[refs.attacker!]!.exhausted).toBe(false);
  });
test('Bokken Saber grants an Advantage to its host when the host attacks', () => {
  const p = board(ids.consular, false);
  p.attachments = [{ card: 'bokken-saber', unit: 'source' }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.source!, state.players.bob!.base);
  expect(tokens(s, refs.source!)).toBe(1);
});
test('Grav Charge fires on its host’s attack, not when the host defends', () => {
  for (const attacking of [false, true]) {
    const p = board(ids.consular, false);
    p.activePlayer = attacking ? 'alice' : 'bob';
    p.players[1].ground = [{ card: 'noti-nomad', ref: 'enemy' }];
    p.attachments = [{ card: 'grav-charge', unit: 'source', ref: 'charge', owner: 'bob' }];
    const { state, refs } = scenario(p);
    const s = attacking
      ? attack(state, refs.source!, state.players.bob!.base)
      : attack(state, refs.enemy!, refs.source!);
    expect(s.cards[refs.charge!]!.zone).toBe(attacking ? 'discard' : 'ground');
    expect(s.cards[refs.source!]!.damage).toBe(attacking ? 4 : 1);
  }
});
test('Camtono privately looks at the top card and can play an affordable card for free', () => {
  for (const cheap of [false, true]) {
    const p = board(ids.consular, false);
    p.players[0].resources = [];
    p.players[0].deck = [
      { card: cheap ? ids.marine : ids.consular, ref: 'top' },
      { card: ids.fighter, ref: 'second' },
    ];
    p.attachments = [{ card: 'camtono', unit: 'source' }];
    const { state, refs } = scenario(p);
    let s = attack(state, refs.source!, state.players.bob!.base);
    expect(s.execution.decision!.selection!.cards).toEqual([refs.top!]);
    expect(s.execution.decision!.playerId).toBe('alice');
    s = step(s, 'accept-effect', [refs.top!]);
    if (cheap) {
      expect(s.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
        true,
      );
      s = step(s, 'play');
    }
    expect(s.cards[refs.top!]!.zone).toBe(cheap ? 'ground' : 'deck');
    expect(s.cards[refs.second!]!.zone).toBe('deck');
  }
});
test('Long Live the Empire resources the top card only after defeating a friendly Imperial', () => {
  const p = board('long-live-the-empire');
  p.players[0].ground = [
    { card: ids.trooper, ref: 'imperial' },
    { card: ids.marine, ref: 'rebel' },
  ];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = step(state, 'play');
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.imperial! },
  ]);
  s = target(s, refs.imperial!);
  expect(s.cards[refs.imperial!]!.zone).toBe('discard');
  expect(s.players.alice!.resources).toHaveLength(21);
  expect(s.players.alice!.deck).toHaveLength(11);
});
test('Exploit Advantage defeats an actual friendly upgrade before drawing two', () => {
  const p = board('exploit-advantage');
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [{ card: 'experience', unit: 'host', ref: 'xp' }];
  const { state, refs } = scenario(p);
  const s = step(step(state, 'play'), 'accept-effect', [refs.xp!]);
  expect(tokens(s, refs.host!, 'experience')).toBe(0);
  expect(s.players.alice!.hand).toHaveLength(2);
});
test('Full of Surprises gives a Shield even when no upgrade is available to return', () => {
  const p = board('full-of-surprises');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  const { state, refs } = scenario(p);
  const s = target(step(step(state, 'play'), 'accept-effect', []), refs.host!);
  expect(tokens(s, refs.host!, 'shield')).toBe(1);
});
test('Choose Your Path checks its selected mode’s trait condition', () => {
  for (const mode of ['heal-base', 'create-mandalorian']) {
    const p = board('choose-your-path');
    p.players[0].base.damage = 8;
    p.players[0].ground = [
      { card: 'ezra-bridger--the-force-is-all-i-need' },
      { card: 'warrior-of-clan-kryze' },
    ];
    const { state } = scenario(p);
    const s = step(step(state, 'play'), i => i.kind === 'choose-mode' && i.mode === mode);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(mode === 'heal-base' ? 3 : 8);
    const created = Object.values(s.cards).filter(
      c => c.zone === 'ground' && c.cardId === 'mandalorian',
    );
    expect(created).toHaveLength(mode === 'heal-base' ? 0 : 1);
    if (created[0]) expect(tokens(s, created[0].instanceId)).toBe(1);
  }
});
test('The Armorer adds Shields to friendly Shielded units, including her own printed Shielded', () => {
  const p = board('the-armorer--secrecy-is-our-survival');
  p.players[0].ground = [
    { card: 'noti-nomad', ref: 'ally' },
    { card: ids.marine, ref: 'plain' },
  ];
  p.players[1].ground = [{ card: 'noti-nomad', ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const s = step(state, 'play');
  expect(tokens(s, refs.source!, 'shield')).toBe(2);
  expect(tokens(s, refs.ally!, 'shield')).toBe(1);
  expect(tokens(s, refs.plain!, 'shield')).toBe(0);
  expect(tokens(s, refs.enemy!, 'shield')).toBe(0);
});
test('Scion Shuttle lends its defending-unit penalty and removes it after combat', () => {
  const p = board('scion-shuttle--at-morgan-s-bidding');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const { state, refs } = scenario(p);
  const s = attack(step(state, 'play'), refs.attacker!, refs.defender!);
  expect(s.cards[refs.defender!]!.zone).toBe('discard');
  expect(s.cards[refs.attacker!]!.damage).toBe(2);
  expect(unitStats(s, s.cards[refs.attacker!]!).power).toBe(3);
});
test('Ezra lends his attack ability and checks whether the borrowing attacker is upgraded', () => {
  const p = board('ezra-bridger--the-force-is-all-i-need');
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  p.attachments = [{ card: 'experience', unit: 'attacker' }];
  const { state, refs } = scenario(p);
  let s = attack(step(state, 'play'), refs.attacker!, refs.defender!);
  s = target(s, refs.defender!);
  expect(s.cards[refs.attacker!]!.damage).toBe(0);
  expect(unitStats(s, s.cards[refs.defender!]!).power).toBe(0);
});
test('Summa Verminoth defeats friendly and enemy space units before combat', () => {
  const p = board('summa-verminoth', false);
  p.players[0].space!.push({ card: ids.fighter, ref: 'ally' });
  p.players[1].space = [{ card: 'mercenary-fleet', ref: 'enemy' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.source!, state.players.bob!.base);
  expect(s.cards[refs.source!]!.zone).toBe('space');
  expect(s.cards[refs.ally!]!.zone).toBe('discard');
  expect(s.cards[refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[refs.ground!]!.zone).toBe('ground');
});
test('Rehabilitation applies its penalty before control and returns the exact unit at regroup', () => {
  const p = board('rehabilitation');
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const { state, refs } = scenario(p);
  let s = target(step(state, 'play'), refs.target!);
  expect(s.cards[refs.target!]!.controller).toBe('alice');
  expect(unitStats(s, s.cards[refs.target!]!).power).toBe(0);
  s = step(s, 'pass');
  s = step(s, 'pass');
  expect(s.cards[refs.target!]!.controller).toBe('bob');
  expect(unitStats(s, s.cards[refs.target!]!).power).toBe(3);
});
test('Axe Woves gains one Advantage for a multi-card draw, including the regroup draw', () => {
  const p = board('axe-woves--undaunted', false);
  p.players[0].hand = [{ card: 'intimidation', ref: 'event' }];
  p.players[0].ground!.push({ card: 'wookiee-chieftain' });
  const { state, refs } = scenario(p);
  let s = step(state, 'play');
  expect(tokens(s, refs.source!)).toBe(1);
  s = step(s, 'pass');
  s = step(s, 'pass');
  expect(tokens(s, refs.source!)).toBe(2);
});
test('Clan Vizsla Soldier may defeat an upgrade after it dies, including an enemy upgrade', () => {
  const p = board('clan-vizsla-soldier', false);
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.attachments = [{ card: 'experience', unit: 'attacker', ref: 'upgrade', owner: 'bob' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.attacker!, refs.source!);
  expect(s.cards[refs.source!]!.zone).toBe('discard');
  s = target(s, refs.upgrade!);
  expect(tokens(s, refs.attacker!, 'experience')).toBe(0);
});
test('Gallofree Transport grants its two Advantages after it leaves play', () => {
  const p = board('gallofree-transport', false);
  p.activePlayer = 'bob';
  p.players[0].space![0]!.damage = 3;
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].space = [{ card: 'mercenary-fleet', ref: 'attacker' }];
  const { state, refs } = scenario(p);
  const s = target(attack(state, refs.attacker!, refs.source!), refs.ally!);
  expect(tokens(s, refs.ally!)).toBe(2);
  expect(s.cards[refs.source!]!.zone).toBe('discard');
});
test('DDC Defender responds to defense and both damages and exhausts its target', () => {
  const p = board(ids.consular, false);
  p.activePlayer = 'bob';
  p.players[1].ground = [
    { card: ids.consular, ref: 'attacker' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.attachments = [{ card: 'ddc-defender', unit: 'source' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.attacker!, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.space,
    ),
  ).toBe(false);
  s = target(s, refs.other!);
  expect(s.cards[refs.other!]!.damage).toBe(1);
  expect(s.cards[refs.other!]!.exhausted).toBe(true);
});
test('Gar Saxon creates a Mandalorian for an upgrade played on him only once per round', () => {
  const p = board('gar-saxon--coveting-power', false);
  p.players[0].hand = [
    { card: 'bokken-saber', ref: 'first' },
    { card: 'bokken-saber', ref: 'second' },
  ];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'play' && i.card === refs.first && i.target === refs.source);
  s = step(s, 'accept-effect');
  expect(
    Object.values(s.cards).filter(c => c.cardId === 'mandalorian' && c.zone === 'ground'),
  ).toHaveLength(1);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === refs.second && i.target === refs.source);
  expect(
    Object.values(s.cards).filter(c => c.cardId === 'mandalorian' && c.zone === 'ground'),
  ).toHaveLength(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Mandalorian Scout exhausts a ready resource on defeat and excludes exhausted resources', () => {
  const p = board('mandalorian-scout', false);
  p.activePlayer = 'bob';
  p.players[0].resources = [
    { card: ids.marine, ref: 'ready' },
    { card: ids.marine, ref: 'exhausted', exhausted: true },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.attacker!, refs.source!);
  expect(s.execution.decision!.selection!.cards).toEqual([refs.ready!]);
  s = step(s, 'accept-effect', [refs.ready!]);
  expect(s.cards[refs.ready!]!.exhausted).toBe(true);
});
test('Mark My Words attaches only to damaged units and grants Overwhelm', () => {
  const p = board('mark-my-words');
  p.players[0].ground = [
    { card: ids.consular, ref: 'hurt', damage: 1 },
    { card: ids.consular, ref: 'healthy' },
  ];
  const { state, refs } = scenario(p);
  expect(
    state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.target === refs.healthy,
    ),
  ).toBe(false);
  const s = step(state, i => i.kind === 'play' && i.target === refs.hurt);
  expect(effectiveAbilities(s, s.cards[refs.hurt!]!).keywords).toContain('Overwhelm');
});
test('The Mayor’s Majordomo must discard and exhaust before exhausting the chosen unit', () => {
  const p = board('mayor-s-majordomo--no-problem-groveling', false);
  p.players[0].hand = [{ card: ids.fighter, ref: 'payment' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'use-ability' && i.card === refs.source);
  s = step(s, 'accept-effect', [refs.payment!]);
  s = target(s, refs.target!);
  expect(s.cards[refs.source!]!.exhausted).toBe(true);
  expect(s.cards[refs.payment!]!.zone).toBe('discard');
  expect(s.cards[refs.target!]!.exhausted).toBe(true);
});
test('Mos Espa Watermonger can decline the draw, or draw then discard the newly drawn card', () => {
  const p = board('mos-espa-watermonger');
  p.players[0].deck = [{ card: ids.consular, ref: 'top' }, ...p.players[0].deck!];
  const { state, refs } = scenario(p);
  const choice = step(state, 'play');
  expect(step(choice, 'decline-effect').players.alice!.hand).toHaveLength(0);
  let s = step(choice, 'accept-effect');
  expect(s.players.alice!.hand).toContain(refs.top!);
  s = step(s, 'accept-effect', [refs.top!]);
  expect(s.cards[refs.top!]!.zone).toBe('discard');
});
test('Mouse Droid discounts only the next Imperial unit, and retains Raid on its attack', () => {
  const p = board('mouse-droid');
  p.players[0].leader.card = 'darth-vader--dark-lord-of-the-sith';
  p.players[0].hand!.push(
    { card: ids.trooper, ref: 'first' },
    { card: ids.trooper, ref: 'second' },
  );
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'play' && i.card === refs.source);
  s = step(s, 'pass');
  const ready = () => s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
  let before = ready();
  s = step(s, i => i.kind === 'play' && i.card === refs.first);
  expect(before - ready()).toBe(0);
  s = step(s, 'pass');
  before = ready();
  s = step(s, i => i.kind === 'play' && i.card === refs.second);
  expect(before - ready()).toBe(1);
});
test('Peli Motto ignores aspect penalties for the first non-unit card only', () => {
  const p = board('peli-motto--you-bring-the-cash-', false);
  p.players[0].hand = [
    { card: 'display-of-strength', ref: 'first' },
    { card: 'display-of-strength', ref: 'second' },
  ];
  p.players[0].base.card = 'dagobah-swamp';
  p.players[0].leader.card = 'iden-versio--inferno-squad-commander';
  const { state, refs } = scenario(p);
  let s = state;
  const ready = () => s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
  let before = ready();
  s = target(
    step(s, i => i.kind === 'play' && i.card === refs.first),
    refs.source!,
  );
  expect(before - ready()).toBe(2);
  s = step(s, 'pass');
  before = ready();
  s = target(
    step(s, i => i.kind === 'play' && i.card === refs.second),
    refs.source!,
  );
  expect(before - ready()).toBe(4);
});
test('Qi’ra’s power follows hand size and her discard gates the damage', () => {
  const p = board('qi-ra--master-of-ter-s-k-si');
  p.players[0].hand!.push({ card: ids.marine, ref: 'discard' });
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const { state, refs } = scenario(p);
  const choice = step(state, i => i.kind === 'play' && i.card === refs.source);
  expect(unitStats(choice, choice.cards[refs.source!]!).power).toBe(8);
  expect(step(choice, 'accept-effect', []).cards[refs.target!]!.damage).toBe(0);
  let s = step(choice, 'accept-effect', [refs.discard!]);
  s = target(s, refs.target!);
  expect(s.cards[refs.target!]!.damage).toBe(3);
  expect(unitStats(s, s.cards[refs.source!]!).power).toBe(9);
});
test('Queen Soruna reveals a hand unit and restricts damage to that printed cost', () => {
  const p = board('queen-soruna--willing-to-fight');
  p.players[0].hand!.push({ card: ids.marine, ref: 'reveal' });
  p.players[1].ground = [
    { card: ids.marine, ref: 'match' },
    { card: ids.consular, ref: 'wrong' },
  ];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'play' && i.card === refs.source);
  s = step(s, 'accept-effect', [refs.reveal!]);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.wrong,
    ),
  ).toBe(false);
  s = target(s, refs.match!);
  expect(s.cards[refs.match!]!.zone).toBe('discard');
  expect(s.cards[refs.reveal!]!.zone).toBe('hand');
});
test('The Twins grant Sentinel to another friendly unit and heal for another ally’s defeat', () => {
  const p = board('the-twins--we-don-t-want-war');
  p.players[0].base.damage = 5;
  p.players[0].ground = [{ card: ids.trooper, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  const { state, refs } = scenario(p);
  let s = step(state, 'play');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.source,
    ),
  ).toBe(false);
  s = target(s, refs.ally!);
  expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Sentinel');
  s = attack(s, refs.attacker!, refs.ally!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
});
test('Imperial Defector inspection hides the opponent’s cards from spectators and survives recovery', async () => {
  const { Projector } = await import('../projection/projector.ts');
  const p = board('imperial-defector');
  p.players[1].hand = [{ card: 'wookiee-chieftain', ref: 'secret' }];
  const { state, refs } = scenario(p);
  const s = step(state, 'play');
  const view = (state: GameState, player?: string) =>
    new Projector(
      state.gameId,
      player ? { role: 'player', playerId: player } : { role: 'spectator' },
      'v'.repeat(32),
    ).project(state);
  expect(JSON.stringify(view(s, 'alice'))).toContain('Wookiee Chieftain');
  const hidden = structuredClone(s);
  hidden.cards[refs.secret!]!.cardId = 'noti-nomad';
  expect(view(s)).toEqual(view(hidden));
  expect(decodeState(encodeState(s))).toEqual(s);
  const input = choose(s, 'accept-effect');
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
  expect(step(s, 'accept-effect').players.bob!.hand).toEqual([refs.secret!]);
});
