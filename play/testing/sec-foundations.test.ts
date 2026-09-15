import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attach, attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { move, playCost } from '../engine/state.ts';
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
for (const card of [
  'populist-champion',
  'raxian-assembly',
  'supreme-council-aide',
  'contraband-starhopper',
  'coruscant-undercity-police',
  'crait-veteran',
])
  test(`${card}: enters exhausted and uses printed combat statistics`, () => {
    const { state, refs } = scenario(board(card, true));
    const after = step(state, i => i.kind === 'play' && i.card === refs.unit);
    const d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    expect(after.cards[refs.unit!]!.zone).toBe(d.arena);
    expect(after.cards[refs.unit!]!.exhausted).toBe(true);
    expect(unitStats(after, after.cards[refs.unit!]!)).toEqual({ power: d.power, hp: d.hp });
  });

for (const card of [
  'enforcer-squadron',
  'rebellious-functionary',
  'sith-assassin',
  'zenuas-shadow-fighter',
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
  ['alderaanian-envoys', 0, 3],
  ['chandrilan-sponsor', 0, 2],
  ['asp-laborer', 0, 1],
  ['loan-shark', 1, 0],
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
  'ando-commission',
  'consular-s-cruiser',
  'cruel-commandos',
  'defense-fleet-x-wing',
  'dogmatic-shock-squad',
  'jade-squadron-patrol',
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
for (const card of ['rebel-pathfinder', 'reckless-rebel'])
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
    expect(after.cards[refs.enemy!]!.damage).toBe(d.power);
  });
for (const card of ['cruel-commandos', 'daro-commando', 'republic-war-walker'])
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
for (const card of ['lost-jedi', 'republic-aurek-starfighter'])
  test(`${card}: Grit adds damage to power`, () => {
    const p = board(card);
    const def = cardDefinition(card);
    if (def.kind !== 'unit') throw Error();
    p.players[0][def.arena]![0]!.damage = 1;
    const { state, refs } = scenario(p),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    expect(
      attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
    ).toBe(d.power + 1);
  });
for (const card of ['loan-shark', 'shadow-crawler'])
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
const refresh = (s: GameState) => {
  s.execution.decision = null;
  settle(s);
};
const power = (s: GameState, id: string) => unitStats(s, s.cards[id]!).power;
const keyword = (s: GameState, id: string, k: string) =>
  effectiveAbilities(s, s.cards[id]!).keywords?.includes(k as never);
test('conditional SEC Raid uses current names, traits and damaged enemies', () => {
  for (const [card, ally, damage] of [
    ['high-command-councilor', 'supreme-council-aide', false],
    ['hunting-assassin-droid', ids.marine, true],
  ] as const) {
    const p = board(card);
    p.players[damage ? 1 : 0].ground ??= [];
    p.players[damage ? 1 : 0].ground!.push({
      card: ally,
      ref: 'condition',
      damage: damage ? 1 : 0,
    });
    const { state, refs } = scenario(p),
      d = cardDefinition(card);
    if (d.kind !== 'unit') throw Error();
    const after = attack(state, refs.unit!, state.players.bob!.base);
    expect(after.cards[state.players.bob!.base]!.damage).toBe(d.power + 2);
    state.cards[refs.condition!]!.damage = 0;
    move(state, state.cards[refs.condition!]!, 'discard');
    refresh(state);
    expect(
      attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
    ).toBe(d.power);
  }
});
test('Corrupt Politician needs a strict unit majority and Rotunda needs no damage', () => {
  const p = board('corrupt-politician');
  p.players[0].ground!.push({ card: 'rotunda-senate-guards', ref: 'guard' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(true);
  state.cards[refs.guard!]!.damage = 1;
  expect(keyword(state, refs.guard!, 'Sentinel')).toBe(false);
  move(state, state.cards[refs.guard!]!, 'discard');
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(false);
});
test('Kino excludes himself; Kazuda compares resources; Senator’s Aide follows initiative', () => {
  const p = board('kino-loy--you-answer-to-me');
  p.players[0].ground!.push(
    { card: 'kazuda-xiono--i-m-not-a-spy', ref: 'kazuda', exhausted: true },
    { card: 'senator-s-aide', ref: 'aide', exhausted: true },
  );
  p.players[1].ground = [{ card: ids.marine, exhausted: true }];
  p.players[1].resources = Array.from({ length: 19 }, () => ({ card: ids.marine }));
  const { state, refs } = scenario(p);
  const printed = (id: string) => {
    const d = cardDefinition(state.cards[id]!.cardId);
    if (d.kind !== 'unit') throw Error();
    return d.power;
  };
  expect(power(state, refs.unit!)).toBe(printed(refs.unit!) + 2);
  expect(power(state, refs.kazuda!)).toBe(printed(refs.kazuda!) + 2);
  expect(power(state, refs.aide!)).toBe(printed(refs.aide!) + 2);
  state.cards[refs.unit!]!.exhausted = true;
  state.cards[refs.aide!]!.exhausted = false;
  state.initiative.holder = 'bob';
  expect(power(state, refs.unit!)).toBe(printed(refs.unit!) + 1);
  expect(power(state, refs.aide!)).toBe(printed(refs.aide!));
});
test('Nubian Restore and Coronet’s other-unit Restore stack then disappear with the source', () => {
  const p = board('nubian-star-skiff');
  p.players[0].space!.push({ card: 'coronet--stately-vessel', ref: 'coronet' });
  p.players[0].ground = [{ card: 'supreme-council-aide', ref: 'official' }];
  p.players[0].base.damage = 10;
  const { state, refs } = scenario(p);
  expect(
    attack(state, refs.unit!, state.players.bob!.base).cards[state.players.alice!.base]!.damage,
  ).toBe(7);
  move(state, state.cards[refs.official!]!, 'discard');
  move(state, state.cards[refs.coronet!]!, 'discard');
  refresh(state);
  expect(
    attack(state, refs.unit!, state.players.bob!.base).cards[state.players.alice!.base]!.damage,
  ).toBe(10);
});
test('Figure of Unity grants its aura only while its unique host is ready, even with an enemy-owned upgrade', () => {
  const p = board('kino-loy--you-answer-to-me');
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'figure-of-unity', unit: 'unit', owner: 'bob' }];
  const { state, refs } = scenario(p);
  expect(keyword(state, refs.ally!, 'Overwhelm')).toBe(true);
  expect(keyword(state, refs.unit!, 'Overwhelm')).toBe(false);
  expect(keyword(state, refs.enemy!, 'Overwhelm')).toBe(false);
  state.cards[refs.unit!]!.exhausted = true;
  expect(keyword(state, refs.ally!, 'Overwhelm')).toBe(false);
  state.cards[refs.unit!]!.exhausted = false;
  modifyUnit(state, state.cards[refs.unit!]!, state.cards[refs.unit!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(keyword(state, refs.ally!, 'Overwhelm')).toBe(false);
});
test('Disciple’s Devotion derives exhaustion from the host; Zam derives Grit from upgrades', () => {
  const p = board('zam-wesell--inconspicuous-assassin');
  p.players[0].ground![0]!.damage = 1;
  p.attachments = [{ card: 'disciples--devotion', unit: 'unit' }];
  const { state, refs } = scenario(p);
  expect(keyword(state, refs.unit!, 'Grit')).toBe(true);
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(false);
  state.cards[refs.unit!]!.exhausted = true;
  expect(keyword(state, refs.unit!, 'Sentinel')).toBe(true);
});
test('Muckraker’s ready protection allows Sentinel’s exception', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'muckraker-crab-droid', ref: 'crab' }];
  const { state, refs } = scenario(p);
  const targets = () =>
    state.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent.defender] : [],
    );
  expect(targets()).not.toContain(refs.crab!);
  state.cards[refs.crab!]!.exhausted = true;
  refresh(state);
  expect(targets()).toContain(refs.crab!);
  state.cards[refs.crab!]!.exhausted = false;
  modifyUnit(state, state.cards[refs.crab!]!, state.cards[refs.crab!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Sentinel'] },
  });
  refresh(state);
  expect(targets()).toEqual([refs.crab!]);
});
test('Vel weakens only an exhausted enemy while it defends', () => {
  const p = board('vel-sartha--one-path--one-choice');
  p.players[0].ground!.push({ card: ids.consular, ref: 'attacker' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy', exhausted: true }];
  const { state, refs } = scenario(p);
  expect(power(state, refs.enemy!)).toBe(3);
  const after = attack(state, refs.attacker!, refs.enemy!);
  expect(after.cards[refs.attacker!]!.damage).toBe(1);
});
test('Hondo grants other units Raid, and Tala protects only units entering this phase', () => {
  const p = board('hondo-ohnaka--you-better-hurry');
  p.players[0].ground!.push(
    { card: ids.marine, ref: 'ally' },
    { card: 'tala-durith--i-can-get-you-inside', ref: 'tala' },
  );
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.enteredThisPhase = ['ally', 'tala'];
  const { state, refs } = scenario(p);
  expect(
    attack(state, refs.ally!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
  ).toBe(4);
  let s = step(state, 'pass');
  const targets = s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'attack' ? [o.intent.defender] : [],
  );
  expect(targets).not.toContain(refs.ally!);
  expect(targets).toContain(refs.tala!);
  expect(targets).toContain(refs.unit!);
});
test('Congress discounts the first upgrade role, including Piloting but excluding playing that Pilot as a unit', () => {
  const p = board('congress-of-malastare');
  p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  p.players[0].hand = [
    { card: 'academy-graduate', ref: 'pilot' },
    { card: 'sneaking-suspicion', ref: 'upgrade' },
  ];
  const { state, refs } = scenario(p);
  const cost = (s: GameState, id: string, target?: string) =>
    playCost(
      s,
      s.cards[id]!,
      0,
      target && id === refs.pilot ? 'piloting' : undefined,
      target ? s.cards[target] : undefined,
    );
  const ordinary = cost(state, refs.pilot!);
  const pilotCost = cost(state, refs.pilot!, refs.vehicle!);
  move(state, state.cards[refs.unit!]!, 'discard');
  expect(cost(state, refs.pilot!)).toBe(ordinary);
  expect(cost(state, refs.pilot!, refs.vehicle!)).toBe(pilotCost + 1);
  const again = scenario(p);
  let s = step(again.state, i => i.kind === 'play' && i.card === again.refs.pilot && !i.target);
  s = step(s, 'pass');
  expect(cost(s, again.refs.upgrade!, again.refs.unit!)).toBe(
    cost(again.state, again.refs.upgrade!, again.refs.unit!),
  );
  const withPilot = step(
    again.state,
    i => i.kind === 'play' && i.card === again.refs.pilot && i.target === again.refs.vehicle,
  );
  expect(cost(withPilot, again.refs.upgrade!, again.refs.unit!)).toBe(
    cost(again.state, again.refs.upgrade!, again.refs.unit!) + 1,
  );
});
test('Anakin recognizes Padmé’s leader and deployed unit faces by title', () => {
  for (const deployed of [false, true]) {
    const p = board('anakin-skywalker--secret-husband');
    p.players[0].leader = {
      card: 'padm--amidala--serving-the-republic',
      ...(deployed ? { deployedAs: 'unit' as const } : {}),
    };
    const { state, refs } = scenario(p);
    const d = cardDefinition('anakin-skywalker--secret-husband');
    if (d.kind !== 'unit') throw Error();
    expect(
      attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
    ).toBe(d.power + 2);
  }
  const { state, refs } = scenario(board('anakin-skywalker--secret-husband'));
  const d = cardDefinition('anakin-skywalker--secret-husband');
  if (d.kind !== 'unit') throw Error();
  expect(
    attack(state, refs.unit!, state.players.bob!.base).cards[state.players.bob!.base]!.damage,
  ).toBe(d.power);
});
