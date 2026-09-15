import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attach, attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { cardDefinition } from '../cards/registry.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken, gainForce, useForce } from '../engine/force.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { addCard, move, playCost } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const step = (s: GameState, p: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, p)).state;
const refresh = (s: GameState) => {
  s.execution.decision = null;
  settle(s);
};
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
function board(card: string, hand = false) {
  const p = position(),
    d = cardDefinition(card);
  if (d.kind !== 'unit') throw Error();
  p.players[0][hand ? 'hand' : d.arena] = [{ card, ref: 'unit' }];
  p.players[0].resources = Array.from({ length: 25 }, () => ({ card: ids.marine }));
  return p;
}
function printed(card: string) {
  const d = cardDefinition(card);
  if (d.kind !== 'unit') throw Error();
  return { power: d.power, hp: d.hp };
}
const stats = (s: GameState, id: string) => unitStats(s, s.cards[id]!);
const keyword = (s: GameState, id: string, k: string) =>
  effectiveAbilities(s, s.cards[id]!).keywords?.includes(k as never) ?? false;
const blank = (s: GameState, id: string) =>
  modifyUnit(s, s.cards[id]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
for (const card of [
  'army-of-the-dead',
  'awakened-specters',
  'fallen-jedi',
  'gifted-urchin',
  'hyperspace-wayfarer',
  'knight-of-ren',
  'outer-rim-mystic',
  'porg',
  'ravenous-rathtar',
])
  test(`${card}: ordinary play enters exhausted with its printed combat profile`, () => {
    const { state, refs } = scenario(board(card, true));
    const s = step(state, 'play');
    expect(s.cards[refs.unit!]!.exhausted).toBe(true);
    expect(stats(s, refs.unit!)).toEqual(printed(card));
  });
for (const [card, raid, restore] of [
  ['blue-squadron-assault-wing', 1, 0],
  ['cartel-interceptor', 2, 0],
  ['hive-defense-wing', 0, 1],
  ['longbeam-cruiser', 0, 1],
  ['magistrate-s-scout', 0, 2],
  ['nihil-marauder', 3, 0],
  ['relic-scavenger', 0, 2],
  ['thralls-of-the-coven', 3, 0],
  ['village-tender', 0, 1],
  ['jedi-temple-guards', 0, 2],
  ['eye-of-sion--to-peridea', 0, 1],
  ['gungan-warrior', 0, 1],
] as const)
  test(`${card}: Raid/Restore resolve during an actual attack and expire afterward`, () => {
    const p = board(card);
    p.players[0].base.damage = 8;
    const { state, refs } = scenario(p);
    const s = attack(state, refs.unit!, state.players.bob!.base);
    expect(s.cards[state.players.bob!.base]!.damage).toBe(printed(card).power + raid);
    expect(s.cards[state.players.alice!.base]!.damage).toBe(8 - restore);
    expect(stats(s, refs.unit!).power).toBe(printed(card).power);
  });
for (const card of [
  'attuned-fyrnock',
  'banking-clan-shuttle',
  'tuk-ata',
  'vulptex',
  'witch-of-the-mist',
  'anakin-skywalker--force-prodigy',
])
  test(`${card}: Hidden protects only the newly played incarnation`, () => {
    const p = board(card, true),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[0][d.arena] = [{ card, ref: 'old' }];
    p.players[1][d.arena] = [{ card: d.arena === 'ground' ? ids.consular : ids.fighter }];
    // Unique Anakin is checked on his own; other cards also exercise duplicate copies.
    if (card.startsWith('anakin')) p.players[0][d.arena] = [];
    const { state, refs } = scenario(p);
    let s = step(state, 'play');
    if (card.startsWith('anakin'))
      expect(attachedUpgrades(s, s.cards[refs.unit!]!)).toHaveLength(1);
    const defenders = s.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent.defender] : [],
    );
    expect(defenders).not.toContain(refs.unit);
    if (refs.old) expect(defenders).toContain(refs.old);
  });
for (const card of ['charging-phillak', 'kowakian-monkey-lizard', 'mysterious-hermit'])
  test(`${card}: v8 Ambush permits the exhausted attack without readying`, () => {
    const p = board(card, true);
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = step(state, 'play');
    expect(s.cards[refs.unit!]!.exhausted).toBe(true);
    s = step(s, i => i.kind === 'target' && i.card === refs.enemy);
    expect(s.cards[refs.enemy!]!.damage).toBe(printed(card).power);
    expect(s.execution.decision?.playerId).toBe('bob');
  });
for (const card of ['wampa', 'exegol-patroller', 'mynock', 'trident-assault-ship'])
  test(`${card}: Overwhelm deals only excess and a Shield prevents the entire packet`, () => {
    const p = board(card),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? ids.trooper : ids.fighter, ref: 'enemy' },
    ];
    const { state, refs } = scenario(p);
    expect(attack(state, refs.unit!, refs.enemy!).cards[state.players.bob!.base]!.damage).toBe(
      Math.max(0, d.power - 1),
    );
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const f = scenario(p),
      s = attack(f.state, f.refs.unit!, f.refs.enemy!);
    expect(s.cards[f.refs.enemy!]!.damage).toBe(0);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
  });
test('Sorcerers gain a Shield on play; Sandtrooper Cavalry converts its damage to Grit power', () => {
  const a = scenario(board('sorcerers-of-tund', true)),
    s = step(a.state, 'play');
  expect(attachedUpgrades(s, s.cards[a.refs.unit!]!)).toHaveLength(1);
  const p = board('sandtrooper-cavalry');
  p.players[0].ground![0]!.damage = 2;
  const b = scenario(p);
  expect(
    attack(b.state, b.refs.unit!, b.state.players.bob!.base).cards[b.state.players.bob!.base]!
      .damage,
  ).toBe(printed('sandtrooper-cavalry').power + 2);
});
test('Nexu and Legionnaire require another friendly unit of the appropriate aspect', () => {
  for (const [card, ally, bonus] of [
    ['hunting-nexu', ids.trooper, 2],
    ['sith-legionnaire', ids.trooper, 2],
  ] as const) {
    const p = board(card);
    p.players[0].ground!.push({ card: ally, ref: 'ally' });
    const { state, refs } = scenario(p);
    expect(
      attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
    ).toBe(printed(card).power + bonus);
    move(state, state.cards[refs.ally!]!, 'discard');
    refresh(state);
    expect(
      attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
    ).toBe(printed(card).power);
  }
});
test('Padawan Starfighter counts a controlled Force upgrade; Jedi Vector separately counts Jedi and Lightsabers', () => {
  const p = board('padawan-starfighter');
  p.players[0].space!.push({ card: 'jedi-vector', ref: 'vector' });
  p.players[0].ground = [{ card: 'jedi-guardian', ref: 'jedi' }];
  p.attachments = [{ card: 'heirloom-lightsaber', unit: 'jedi', ref: 'saber' }];
  const { state, refs } = scenario(p);
  expect(stats(state, refs.unit!)).toEqual({ power: 2, hp: 4 });
  expect(stats(state, refs.vector!).power).toBe(printed('jedi-vector').power + 2);
  move(state, state.cards[refs.saber!]!, 'discard');
  expect(stats(state, refs.vector!).power).toBe(printed('jedi-vector').power + 1);
  move(state, state.cards[refs.jedi!]!, 'discard');
  expect(stats(state, refs.vector!).power).toBe(printed('jedi-vector').power + 1);
  expect(stats(state, refs.unit!)).toEqual(printed('padawan-starfighter'));
  // Upgrade ownership, rather than host ownership, controls this condition.
  const enemy = addCard(state, 'bob', 'jedi-guardian', 'ground');
  const upgrade = addCard(state, 'alice', 'bolstered-endurance', 'hand');
  attach(state, upgrade, enemy, false);
  expect(stats(state, refs.unit!)).toEqual({ power: 2, hp: 4 });
  upgrade.controller = 'bob';
  expect(stats(state, refs.unit!)).toEqual(printed('padawan-starfighter'));
  move(state, state.cards[refs.unit!]!, 'discard');
  expect(stats(state, refs.vector!).power).toBe(printed('jedi-vector').power);
});
test('Enoch counts Trooper units in his own discard, not other card kinds or opposing discards', () => {
  const p = board('captain-enoch--captain-of-the-guard');
  p.players[0].discard = [{ card: ids.trooper, ref: 'trooper' }, { card: ids.marine }];
  p.players[1].discard = [{ card: ids.trooper }];
  const { state, refs } = scenario(p);
  expect(stats(state, refs.unit!).power).toBe(
    printed('captain-enoch--captain-of-the-guard').power + 2,
  );
  move(state, state.cards[refs.trooper!]!, 'hand');
  expect(stats(state, refs.unit!).power).toBe(
    printed('captain-enoch--captain-of-the-guard').power + 1,
  );
  blank(state, refs.unit!);
  expect(stats(state, refs.unit!).power).toBe(printed('captain-enoch--captain-of-the-guard').power);
});
test('Jedi Guardian adds defending power only in combat; Inquisitor’s Lightsaber checks a Force defender', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'guard' }];
  const { state, refs } = scenario(p);
  expect(stats(state, refs.guard!).power).toBe(printed('jedi-guardian').power);
  expect(attack(state, refs.attacker!, refs.guard!).cards[refs.attacker!]!.damage).toBe(
    printed('jedi-guardian').power + 2,
  );
  p.attachments = [{ card: 'inquisitor-s-lightsaber', unit: 'attacker' }];
  const f = scenario(p),
    s = attack(f.state, f.refs.attacker!, f.refs.guard!);
  expect(s.cards[f.refs.guard!]!.damage).toBe(6);
  expect(stats(f.state, f.refs.attacker!).power).toBe(4);
});
test('Force-dependent abilities track the token and disappear with ability loss', () => {
  const p = board('jedi-sentinel');
  p.players[0].ground!.push(
    { card: 'plo-koon--i-don-t-believe-in-chance', ref: 'plo', damage: 1 },
    { card: 'the-son--embodiment-of-darkness', ref: 'son' },
  );
  const { state, refs } = scenario(p);
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(false);
  expect(keyword(state, refs.plo!, 'Grit')).toBe(false);
  gainForce(state, 'alice');
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(true);
  expect(keyword(state, refs.plo!, 'Grit')).toBe(true);
  expect(stats(state, refs.plo!).power).toBe(
    printed('plo-koon--i-don-t-believe-in-chance').power + 3,
  );
  blank(state, refs.son!);
  expect(stats(state, refs.plo!).power).toBe(
    printed('plo-koon--i-don-t-believe-in-chance').power + 1,
  );
  useForce(state, 'alice', state.cards[refs.plo!]!);
  expect(forceToken(state, 'alice')).toBeUndefined();
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(false);
});
test('Life Wind Sage tracks enemy exhaustion; Scimitar tracks its own damage', () => {
  const p = board('life-wind-sage');
  p.players[0].space = [{ card: 'scimitar--sith-infiltrator', ref: 'ship', damage: 1 }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy', exhausted: true }];
  const { state, refs } = scenario(p);
  expect(
    attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
  ).toBe(printed('life-wind-sage').power + 2);
  state.cards[refs.enemy!]!.exhausted = false;
  refresh(state);
  expect(
    attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
  ).toBe(printed('life-wind-sage').power);
  expect(stats(state, refs.ship!).power).toBe(printed('scimitar--sith-infiltrator').power + 3);
  state.cards[refs.ship!]!.damage = 0;
  expect(stats(state, refs.ship!).power).toBe(printed('scimitar--sith-infiltrator').power);
});
test('Praetorian Guard uses current modified power, including its own, without inventing a prerequisite', () => {
  const p = board('praetorian-guard');
  const { state, refs } = scenario(p);
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(false);
  modifyUnit(state, state.cards[refs.unit!]!, state.cards[refs.unit!]!, {
    kind: 'modify',
    power: 2,
    hp: 0,
    duration: 'phase',
  });
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(true);
});
test('Terentatek gains Ambush only from an opposing Force unit', () => {
  const p = board('terentatek', true);
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'force' }];
  const { state, refs } = scenario(p),
    s = step(state, 'play');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.force,
    ),
  ).toBe(true);
  p.players[1].ground = [{ card: ids.marine }];
  const f = scenario(p);
  expect(step(f.state, 'play').execution.decision?.kind).toBe('action');
});
test('Supremacy boosts only other friendly Vehicles; losing its ability removes both bonuses', () => {
  const p = board('supremacy--of-unimaginable-size');
  p.players[0].space!.push({ card: ids.fighter, ref: 'ally' });
  p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  expect(stats(state, refs.ally!)).toEqual({ power: 8, hp: 7 });
  expect(stats(state, refs.unit!)).toEqual(printed('supremacy--of-unimaginable-size'));
  expect(stats(state, refs.ground!)).toEqual(printed(ids.marine));
  expect(stats(state, refs.enemy!)).toEqual(printed(ids.fighter));
  blank(state, refs.unit!);
  expect(stats(state, refs.ally!)).toEqual(printed(ids.fighter));
});
test('Force-only upgrades reject non-Force hosts; Heirloom grants Restore to its host only while Force', () => {
  const p = position();
  p.players[0].base.damage = 4;
  p.players[0].ground = [
    { card: 'jedi-guardian', ref: 'force' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.players[0].hand = [{ card: 'bolstered-endurance', ref: 'upgrade' }];
  p.players[0].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  const { state, refs } = scenario(p);
  const targets = state.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'play' && o.intent.card === refs.upgrade ? [o.intent.target] : [],
  );
  expect(targets).toEqual([refs.force!]);
  p.attachments = [
    { card: 'heirloom-lightsaber', unit: 'force' },
    { card: 'heirloom-lightsaber', unit: 'marine' },
  ];
  const f = scenario(p);
  expect(
    attack(f.state, f.refs.force!, f.state.players.bob!.base).cards[f.state.players.alice!.base]!
      .damage,
  ).toBe(3);
  expect(
    attack(f.state, f.refs.marine!, f.state.players.bob!.base).cards[f.state.players.alice!.base]!
      .damage,
  ).toBe(4);
});
test('Guardian’s round discount belongs to each exact host; unrelated upgrades and tokens do not consume it', () => {
  const p = board('guardian-of-the-whills');
  p.players[0].ground!.push({ card: 'guardian-of-the-whills', ref: 'other' });
  p.players[0].hand = [
    { card: 'academy-training', ref: 'a' },
    { card: 'academy-training', ref: 'b' },
  ];
  const { state, refs } = scenario(p);
  const cost = (s: GameState, id: string, target: string) =>
    playCost(s, s.cards[id]!, 0, undefined, s.cards[target]!);
  expect(cost(state, refs.a!, refs.unit!)).toBe(1);
  let s = step(state, i => i.kind === 'play' && i.card === refs.a && i.target === refs.other);
  s = step(s, 'pass');
  expect(cost(s, refs.b!, refs.unit!)).toBe(1);
  expect(cost(s, refs.b!, refs.other!)).toBe(2);
  const recovered = decodeState(encodeState(s));
  expect(cost(recovered, refs.b!, refs.unit!)).toBe(1);
  const invalid = structuredClone(s);
  invalid.roundHistory.plays[0]!.host!.incarnation += 100;
  expect(() => decodeState(encodeState(invalid))).toThrow();
});
