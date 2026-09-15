import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { cardDefinition } from '../cards/registry.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

const step = (s: GameState, predicate: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, predicate)).state;
const attack = (s: GameState, attacker: string, defender: string) => {
  let next = step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender,
  );
  while (next.execution.decision?.kind === 'trigger') next = step(next, 'trigger');
  return next;
};
function board(card: string, inHand = false) {
  const p = position();
  const definition = cardDefinition(card);
  if (definition.kind !== 'unit') throw Error('Unit required');
  p.players[0][inHand ? 'hand' : definition.arena] = [{ card, ref: 'unit' }];
  p.players[0].resources = Array.from({ length: 18 }, () => ({ card: ids.marine }));
  return p;
}
for (const card of ['emperor-s-champion', 'noti-nomad', 'scorpenek-annihilator-droid'])
  test(`${card}: playing creates a Shield on that exact copy`, () => {
    const { state, refs } = scenario(board(card, true));
    const after = step(state, 'play');
    expect(attachedUpgrades(after, after.cards[refs.unit!]!).map(c => c.cardId)).toEqual([
      'shield',
    ]);
    expect(after.cards[refs.unit!]!.exhausted).toBe(true);
  });
for (const card of ['covert-veteran', 'remnant-trooper-corps', 'womp-rat', 'stolen-eta-shuttle'])
  test(`${card}: Hidden protects a played copy but not an earlier copy`, () => {
    const p = board(card, true);
    const d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[0][d.arena] = [{ card, ref: 'old' }];
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? ids.consular : ids.fighter, ref: 'enemy' },
    ];
    const { state, refs } = scenario(p);
    const after = step(state, 'play');
    const targets = after.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent.defender] : [],
    );
    expect(targets).toContain(refs.old!);
    expect(targets).not.toContain(refs.unit!);
  });
for (const [card, power, heal] of [
  ['forest-patroller', 3, 1],
  ['rebel-infiltrators', 4, 1],
  ['remnant-official', 3, 2],
  ['pathfinder-sergeant', 2, 1],
] as const)
  test(`${card}: attack damage and Restore use the attacking controller`, () => {
    const p = board(card);
    p.players[0].base.damage = 5;
    p.players[1].base.damage = 5;
    const { state, refs } = scenario(p);
    const after = attack(state, refs.unit!, state.players.bob!.base);
    expect(after.cards[after.players.alice!.base]!.damage).toBe(5 - heal);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(5 + power);
  });
for (const [card, power] of [
  ['alamite-hunter', 1],
  ['forest-patroller', 3],
  ['tempest-lieutenant', 3],
  ['scorpenek-annihilator-droid', 5],
] as const)
  test(`${card}: Overwhelm deals only excess damage to the base`, () => {
    const p = board(card);
    p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
    const { state, refs } = scenario(p);
    const after = attack(state, refs.unit!, refs.defender!);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(Math.max(0, power - 1));
  });
for (const [card, power] of [
  ['praetorian-elite', 5],
  ['wookiee-chieftain', 4],
] as const)
  test(`${card}: Grit adds actual damage to combat power`, () => {
    const p = board(card);
    p.players[0].ground![0]!.damage = 2;
    const { state, refs } = scenario(p);
    const after = attack(state, refs.unit!, state.players.bob!.base);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(power + 2);
  });
for (const card of [
  'imperial-loyalist',
  'n5-sentry-droid',
  'survivors--langskib',
  'scorpenek-annihilator-droid',
])
  test(`${card}: Sentinel diverts enemy attacks from other defenders`, () => {
    const p = position();
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].ground = [
      { card, ref: 'sentinel' },
      { card: ids.consular, ref: 'other' },
    ];
    const { state, refs } = scenario(p);
    const attacks = state.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent.defender] : [],
    );
    expect(attacks).toEqual([refs.sentinel!]);
  });
for (const card of ['emperor-s-champion', 'rebel-infiltrators', 'tie-striker'])
  test(`${card}: Saboteur bypasses Sentinel and defeats defender Shields`, () => {
    const p = board(card);
    const d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? 'imperial-loyalist' : 'graceful-purrgil', ref: 'sentinel' },
      { card: d.arena === 'ground' ? ids.consular : 'mercenary-fleet', ref: 'other' },
    ];
    p.attachments = [{ card: 'shield', unit: 'other' }];
    const { state, refs } = scenario(p);
    expect(
      state.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === state.players.bob!.base,
      ),
    ).toBe(true);
    const after = attack(state, refs.unit!, refs.other!);
    expect(attachedUpgrades(after, after.cards[refs.other!]!)).toEqual([]);
    expect(after.cards[refs.other!]!.damage).toBe(d.power);
  });
test('Blurrg lends Overwhelm to another unit for just its Support attack', () => {
  const p = board('blurrg', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
  const { state, refs } = scenario(p);
  const choice = step(state, 'play');
  const after = attack(choice, refs.attacker!, refs.defender!);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(2);
  expect(effectiveAbilities(after, after.cards[refs.attacker!]!).keywords).not.toContain(
    'Overwhelm',
  );
  expect(decodeState(encodeState(after))).toEqual(after);
});
test('Carson lends first combat damage, preventing defeated defenders from hitting back', () => {
  const p = board('carson-teva--there-s-something-going-on', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const { state, refs } = scenario(p);
  const after = attack(step(state, 'play'), refs.attacker!, refs.defender!);
  expect(after.cards[refs.defender!]!.zone).toBe('discard');
  expect(after.cards[refs.attacker!]!.damage).toBe(0);
  expect(effectiveAbilities(after, after.cards[refs.attacker!]!).firstCombatDamage).toBe(false);
});
test('Initiative continuously controls Consortium Restore and stolen shuttle power', () => {
  for (const holder of ['alice', 'bob']) {
    const p = board('consortium-starviper');
    p.initiative = { holder };
    p.players[0].base.damage = 5;
    p.players[0].space!.push({ card: 'stolen-eta-shuttle', ref: 'shuttle' });
    const { state, refs } = scenario(p);
    expect(unitStats(state, state.cards[refs.shuttle!]!).power).toBe(holder === 'alice' ? 5 : 3);
    const after = attack(state, refs.unit!, state.players.bob!.base);
    expect(after.cards[after.players.alice!.base]!.damage).toBe(holder === 'alice' ? 3 : 5);
  }
});
test('Bo-Katan needs another friendly Mandalorian and her Raid expires after combat', () => {
  for (const friendly of [false, true]) {
    const p = board('bo-katan-kryze--for-all-of-mandalore');
    (p.players[friendly ? 0 : 1].ground ??= []).push({ card: 'warrior-of-clan-kryze' });
    const { state, refs } = scenario(p);
    const after = attack(state, refs.unit!, state.players.bob!.base);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(friendly ? 4 : 2);
    expect(unitStats(after, after.cards[refs.unit!]!).power).toBe(2);
  }
});
test('Warrior Sentinel requires another exhausted friendly unit', () => {
  for (const other of [false, true]) {
    const p = board('warrior-of-clan-kryze');
    p.players[0].ground![0]!.exhausted = true;
    if (other) p.players[0].ground!.push({ card: ids.marine, exhausted: true });
    const { state, refs } = scenario(p);
    expect(
      effectiveAbilities(state, state.cards[refs.unit!]!).keywords?.includes('Sentinel') ?? false,
    ).toBe(other);
  }
});
test('A deployed leader enables Super Commandos power and Flagship Ambush; base-side leaders do not', () => {
  for (const deployed of [false, true]) {
    const p = board('mandalorian-super-commandos');
    if (deployed) p.players[0].leader.deployedAs = 'unit';
    p.players[0].space = [
      { card: 'mandalorian-flagship--captured-from-the-empire', ref: 'flagship' },
    ];
    const { state, refs } = scenario(p);
    expect(unitStats(state, state.cards[refs.unit!]!).power).toBe(deployed ? 4 : 2);
    expect(unitStats(state, state.cards[refs.flagship!]!).power).toBe(deployed ? 6 : 5);
    expect(
      effectiveAbilities(state, state.cards[refs.flagship!]!).keywords?.includes('Ambush') ?? false,
    ).toBe(deployed);
  }
});
test('Domesticated Loth-cat removes enemy entry keywords before an enemy plays the unit', () => {
  for (const card of ['blurrg', 'pathfinder-sergeant']) {
    const p = board(card, true);
    p.players[1].ground = [{ card: 'domesticated-loth-cat' }];
    p.players[0].ground = [{ card: ids.marine }];
    const { state, refs } = scenario(p);
    const after = step(state, 'play');
    expect(after.execution.decision?.kind).toBe('action');
    expect(after.execution.decision?.playerId).toBe('bob');
    expect(effectiveAbilities(after, after.cards[refs.unit!]!).keywords).not.toContain(
      card === 'blurrg' ? 'Support' : 'Ambush',
    );
  }
});
test('Onyx Cinder grants friendly Hidden; Nowhere to Hide grants Sentinel to an enemy host', () => {
  const p = board(ids.marine, true);
  p.players[0].space = [{ card: 'onyx-cinder--adventure-awaits' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let after = step(state, 'play');
  expect(
    after.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === refs.unit,
    ),
  ).toBe(false);
  expect(effectiveAbilities(after, after.cards[refs.enemy!]!).keywords).not.toContain('Hidden');
  const q = position();
  q.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  q.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  q.attachments = [{ card: 'nowhere-to-hide', unit: 'defender', owner: 'alice' }];
  const x = scenario(q);
  expect(
    x.state.execution
      .decision!.options.filter(o => o.intent.kind === 'attack')
      .map(o => (o.intent as Extract<Intent, { kind: 'attack' }>).defender),
  ).toEqual([x.refs.defender!]);
});
test('Pointless to Resist reduces only attacks against bases, including an enemy-owned attachment', () => {
  for (const base of [false, true]) {
    const p = board(ids.consular);
    p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
    p.attachments = [{ card: 'pointless-to-resist', unit: 'unit', owner: 'bob' }];
    const { state, refs } = scenario(p);
    const target = base ? state.players.bob!.base : refs.defender!;
    const after = attack(state, refs.unit!, target);
    expect(after.cards[target]!.damage).toBe(base ? 0 : 3);
    expect(unitStats(after, after.cards[refs.unit!]!).power).toBe(3);
  }
});
