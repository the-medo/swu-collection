import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attach, attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { cardTraits } from '../engine/attributes.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { cardDefinition } from '../cards/registry.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const step = (s: GameState, p: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, p)).state;
function board(card: string, inHand = false) {
  const p = position(),
    d = cardDefinition(card);
  if (d.kind !== 'unit') throw Error();
  p.players[0][inHand ? 'hand' : d.arena] = [{ card, ref: 'unit' }];
  p.players[0].resources = Array.from({ length: 18 }, () => ({ card: ids.marine }));
  return p;
}
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
for (const card of ['alliance-x-wing', 'liberated-wookiee', 'vandor-range-troopers'])
  test(`${card}: enters exhausted and uses printed combat statistics`, () => {
    const { state, refs } = scenario(board(card, true));
    const after = step(state, i => i.kind === 'play' && i.card === refs.unit);
    const d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    expect(after.cards[refs.unit!]!.zone).toBe(d.arena);
    expect(after.cards[refs.unit!]!.exhausted).toBe(true);
    expect(unitStats(after, after.cards[refs.unit!]!)).toEqual({ power: d.power, hp: d.hp });
  });
for (const card of ['ig-88--programmed-to-kill', 'shielded-hauler'])
  test(`${card}: entry shields exactly its own incarnation`, () => {
    const { state, refs } = scenario(board(card, true)),
      after = step(state, 'play');
    expect(attachedUpgrades(after, after.cards[refs.unit!]!).map(c => c.cardId)).toEqual([
      'shield',
    ]);
  });
for (const card of [
  'hidden-hunters',
  'nihil-stormsower',
  'savareen-survivor',
  'seasoned-tracker',
  'wookiee-guerilla',
])
  test(`${card}: Hidden protects a new copy, not the earlier copy`, () => {
    const p = board(card, true),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[0][d.arena] = [{ card, ref: 'old' }];
    p.players[1][d.arena] = [{ card: d.arena === 'ground' ? ids.consular : ids.fighter }];
    const { state, refs } = scenario(p),
      after = step(state, 'play');
    const targets = after.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent.defender] : [],
    );
    expect(targets).toContain(refs.old!);
    expect(targets).not.toContain(refs.unit!);
  });
for (const [card, raid, restore] of [
  ['haxion-aggressor', 2, 0],
  ['kage-elite', 2, 0],
  ['ohnaka-gang-bandits', 3, 0],
  ['partisan-infantry', 1, 0],
  ['wookiee-guerilla', 2, 0],
  ['vigilant-scouts', 0, 2],
] as const)
  test(`${card}: combat resolves Raid and Restore`, () => {
    const p = board(card);
    p.players[0].base.damage = 5;
    const { state, refs } = scenario(p),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    const after = attack(state, refs.unit!, state.players.bob!.base);
    expect(after.cards[state.players.bob!.base]!.damage).toBe(d.power + raid);
    expect(after.cards[state.players.alice!.base]!.damage).toBe(5 - restore);
    expect(unitStats(after, after.cards[refs.unit!]!).power).toBe(d.power);
  });
for (const card of [
  'alkenzi-patroller',
  'igv-55-listener',
  'kessel-hulk',
  'quarren-contractor',
  'stalwart-fleet-trooper',
])
  test(`${card}: Sentinel restricts attacks in its arena`, () => {
    const p = position(),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[0][d.arena] = [{ card: d.arena === 'ground' ? ids.consular : ids.fighter }];
    p.players[1][d.arena] = [
      { card, ref: 'sentinel' },
      { card: d.arena === 'ground' ? ids.marine : ids.fighter },
    ];
    const { state, refs } = scenario(p);
    expect(
      state.execution.decision!.options.flatMap(o =>
        o.intent.kind === 'attack' ? [o.intent.defender] : [],
      ),
    ).toEqual([refs.sentinel!]);
  });
for (const card of [
  'artful-pickpocket',
  'callous-bounty-hunter',
  'kage-elite',
  'ohnaka-gang-starhopper',
  'relentless-hunters',
])
  test(`${card}: Saboteur bypasses Sentinel and defeats Shields`, () => {
    const p = board(card),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? 'stalwart-fleet-trooper' : 'igv-55-listener' },
      { card: d.arena === 'ground' ? ids.consular : 'mercenary-fleet', ref: 'enemy' },
    ];
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const { state, refs } = scenario(p);
    expect(
      state.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === state.players.bob!.base,
      ),
    ).toBe(true);
    const after = attack(state, refs.unit!, refs.enemy!);
    expect(attachedUpgrades(after, after.cards[refs.enemy!]!)).toHaveLength(0);
    expect(after.cards[refs.enemy!]!.damage).toBe(d.power + (card === 'kage-elite' ? 2 : 0));
  });
for (const card of ['cartel-heavy-fighter', 'son-tuul-berserkers'])
  test(`${card}: only excess combat damage overwhelms the base`, () => {
    const p = board(card),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? ids.trooper : ids.fighter, ref: 'enemy' },
    ];
    const { state, refs } = scenario(p),
      after = attack(state, refs.unit!, refs.enemy!);
    expect(after.cards[state.players.bob!.base]!.damage).toBe(d.power - 1);
  });
for (const card of ['quarren-contractor', 'syndicate-security'])
  test(`${card}: Grit adds damage to power`, () => {
    const p = board(card);
    p.players[0].ground![0]!.damage = 2;
    const { state, refs } = scenario(p),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    expect(
      attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
    ).toBe(d.power + 2);
  });
for (const card of ['circuit-challenger', 'guild-ambush-team'])
  test(`${card}: v8 Ambush attacks exhausted without causing a ready trigger`, () => {
    const p = board(card, true);
    p.players[0].hand!.push({ card: 'the-conflict-within', ref: 'conflict' });
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = step(state, i => i.kind === 'play' && i.card === refs.unit);
    expect(s.cards[refs.unit!]!.exhausted).toBe(true);
    // Arrange an attached ready observer at the pending keyword to detect a spurious ready transition.
    attach(s, s.cards[refs.conflict!]!, s.cards[refs.unit!]!, false);
    expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
      { kind: 'target', card: refs.enemy! },
      { kind: 'decline-effect' },
    ]);
    s = step(s, i => i.kind === 'target' && i.card === refs.enemy);
    expect(s.execution.decision?.kind).toBe('action');
    expect(s.execution.decision?.playerId).toBe('bob');
    expect(s.cards[refs.unit!]!.exhausted).toBe(true);
    expect(s.cards[refs.enemy!]!.damage).toBeGreaterThan(0);
    expect(decodeState(encodeState(s))).toEqual(s);
  });
test('Motti boosts only friendly leaders in unit form, and loses the aura with his abilities', () => {
  const p = board('admiral-motti--chain-of-command');
  p.players[0].leader.deployedAs = 'unit';
  p.players[1].leader.deployedAs = 'unit';
  const { state, refs } = scenario(p),
    self = state.cards[state.players.alice!.leader]!,
    enemy = state.cards[state.players.bob!.leader]!;
  expect(unitStats(state, self)).toEqual({ power: 4, hp: 7 });
  expect(unitStats(state, enemy)).toEqual({ power: 2, hp: 5 });
  modifyUnit(state, state.cards[refs.unit!]!, state.cards[refs.unit!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(unitStats(state, self)).toEqual({ power: 2, hp: 5 });
});
test('Fulcrum grants Rebel directly, while its host grants the other-friendly-Rebel aura', () => {
  const p = board(ids.consular);
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'fulcrum', unit: 'unit', owner: 'bob' }];
  const { state, refs } = scenario(p),
    host = state.cards[refs.unit!]!;
  expect(cardTraits(state, host)).toContain('Rebel');
  expect(unitStats(state, state.cards[refs.ally!]!)).toEqual({ power: 5, hp: 5 });
  expect(unitStats(state, state.cards[refs.enemy!]!)).toEqual({ power: 3, hp: 3 });
  expect(unitStats(state, host)).toEqual({ power: 5, hp: 9 });
  modifyUnit(state, host, host, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(cardTraits(state, host)).toContain('Rebel');
  expect(unitStats(state, state.cards[refs.ally!]!)).toEqual({ power: 3, hp: 3 });
});
test('Veiled Strength excludes leaders and grants Grit to an injured non-leader', () => {
  const p = board(ids.consular);
  p.players[0].ground![0]!.damage = 2;
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].hand = [{ card: 'veiled-strength' }];
  const { state, refs } = scenario(p),
    targets = state.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'play' ? [o.intent.target] : [],
    );
  expect(targets).toContain(refs.unit!);
  expect(targets).not.toContain(state.players.alice!.leader);
  const s = step(state, i => i.kind === 'play' && i.target === refs.unit);
  expect(effectiveAbilities(s, s.cards[refs.unit!]!).keywords).toContain('Grit');
  expect(unitStats(s, s.cards[refs.unit!]!).power).toBe(5);
});
