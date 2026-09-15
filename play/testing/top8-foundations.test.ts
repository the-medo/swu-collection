import { expect, test } from 'bun:test';
import { cardDefinition } from '../cards/registry.ts';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

const resources = (n = 16) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const o =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === o.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

for (const base of [
  'shadowed-undercity',
  'crystal-caves',
  'strangled-cliffs',
  'fortress-vader',
  'the-holy-city',
])
  test(`${base}: only friendly Force attacks grant Force, including a deployed leader`, () => {
    for (const [card, force] of [
      ['secretive-sage', true],
      [ids.marine, false],
    ] as const) {
      const p = position();
      p.players[0].base.card = base;
      p.players[0].ground = [{ card, ref: 'attacker' }];
      p.players[1].base.card = base;
      const { state, refs } = scenario(p);
      const after = attack(state, refs.attacker!, state.players.bob!.base);
      expect(!!forceToken(after, 'alice')).toBe(force);
      expect(forceToken(after, 'bob')).toBeUndefined();
      expect(decodeState(encodeState(after))).toEqual(after);
    }
    const p = position();
    p.players[0].base.card = base;
    p.players[0].leader = {
      card: 'luke-skywalker--hero-of-yavin',
      deployedAs: 'unit',
      ref: 'leader',
    };
    const { state, refs } = scenario(p);
    let after = attack(state, refs.leader!, state.players.bob!.base);
    // Luke may trigger his own optional ability in the same attack window.
    while (after.execution.decision?.kind !== 'action') after = step(after, 'decline-effect');
    expect(!!forceToken(after, 'alice')).toBe(true);
  });

test('Vergence Temple checks friendly remaining HP at regroup start', () => {
  for (const [damage, expected] of [
    [3, true],
    [4, false],
  ] as const) {
    const p = position();
    p.players[0].base.card = 'vergence-temple';
    p.players[0].ground = [{ card: ids.consular, damage }];
    p.players[1].ground = [{ card: ids.consular }];
    const after = nextRound(scenario(p).state);
    expect(!!forceToken(after, 'alice')).toBe(expected);
  }
});

for (const base of ['coaxium-mine', 'stygeon-spire', 'contested-caverns'])
  test(`${base}: Epic play ignores one colored penalty but retains Villainy penalties`, () => {
    const p = position();
    p.players[0].base.card = base;
    p.players[0].resources = resources(3);
    p.players[0].hand = [
      { card: ids.marine, ref: 'marine' },
      { card: ids.fighter, ref: 'fighter' },
    ];
    const { state, refs } = scenario(p);
    const choice = step(state, i => i.kind === 'use-ability' && i.abilityId === 'discounted-play');
    const marine = step(choice, i => i.kind === 'play' && i.card === refs.marine);
    expect(marine.players.alice!.resources.filter(id => marine.cards[id]!.exhausted)).toHaveLength(
      2,
    );
    const fighter = step(choice, i => i.kind === 'play' && i.card === refs.fighter);
    expect(fighter.players.alice!.resources.every(id => fighter.cards[id]!.exhausted)).toBe(true);
    const next = nextRound(marine);
    expect(
      next.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'discounted-play',
      ),
    ).toBe(false);
  });

for (const id of [
  'shin-hati--overeager-apprentice',
  'aurra-sing--patient-and-deadly',
  'ewok-warrior',
  'forged-starfighter',
  'tatooine-sand-beast',
  'urrr-k--elite-sharpshooter',
])
  test(`${id}: Hidden protects the newly played copy until the phase ends`, () => {
    const d = cardDefinition(id);
    if (d.kind !== 'unit') throw new Error('Unit expected');
    const p = position();
    p.players[0].hand = [{ card: id, ref: 'new' }];
    p.players[0].resources = resources();
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? ids.consular : ids.fighter, ref: 'enemy' },
    ];
    const { state, refs } = scenario(p);
    const played = step(state, 'play');
    expect(
      played.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === refs.new,
      ),
    ).toBe(false);
    if (id === 'shin-hati--overeager-apprentice')
      expect(upgrades(played, refs.new!)).toEqual(['shield']);
    const next = step(nextRound(played), 'pass');
    expect(
      next.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === refs.new,
      ),
    ).toBe(true);
  });

for (const [id, damage, heal] of [
  ['toydarian-technician', 3, 1],
  ['devaronian-doorbuster', 3, 1],
  ['follower-of-the-code', 2, 1],
  ['storm-raider', 3, 0],
  ['strikeship', 3, 0],
  ['aurra-sing--patient-and-deadly', 3, 0],
  ['forged-starfighter', 2, 0],
  ['urrr-k--elite-sharpshooter', 6, 0],
] as const)
  test(`${id}: attack-only Raid and base Restore resolve with printed statistics`, () => {
    const d = cardDefinition(id);
    if (d.kind !== 'unit') throw new Error('Unit expected');
    const p = position();
    p.players[0][d.arena] = [{ card: id, ref: 'unit' }];
    p.players[0].base.damage = 5;
    const { state, refs } = scenario(p);
    let after = attack(state, refs.unit!, state.players.bob!.base);
    while (after.execution.decision?.kind === 'trigger') after = step(after, 'trigger');
    expect(after.cards[after.players.bob!.base]!.damage).toBe(damage);
    expect(after.cards[after.players.alice!.base]!.damage).toBe(5 - heal);
    expect(unitStats(after, after.cards[refs.unit!]!).power).toBe(d.power);
  });

for (const id of [
  'depa-billaba--a-higher-purpose',
  'orbiting-k-wing',
  'rebel-blockade-runner',
  'shydopp-pirate-skiff',
])
  test(`${id}: Saboteur bypasses Sentinel and removes the exact defender's Shield`, () => {
    const d = cardDefinition(id);
    if (d.kind !== 'unit') throw new Error('Unit expected');
    const p = position();
    p.players[0][d.arena] = [{ card: id, ref: 'attacker' }];
    p.players[1][d.arena] = [
      {
        card: d.arena === 'ground' ? 'night-wind-assailants' : 'graceful-purrgil',
        ref: 'sentinel',
      },
      { card: d.arena === 'ground' ? ids.consular : 'mercenary-fleet', ref: 'target' },
    ];
    p.attachments = [{ card: 'shield', unit: 'target' }];
    const { state, refs } = scenario(p);
    expect(
      state.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === state.players.bob!.base,
      ),
    ).toBe(true);
    const after = attack(state, refs.attacker!, refs.target!);
    expect(upgrades(after, refs.target!)).toEqual([]);
    expect(after.cards[refs.target!]!.damage).toBe(d.power);
  });

for (const id of ['fang-fighter-squadron', 'flanking-tie-interceptor', 'mos-eisley-modifier'])
  test(`${id}: Support offers another friendly unit and lends its own abilities`, () => {
    const p = position();
    p.players[0].resources = resources();
    p.players[0].hand = [{ card: id, ref: 'support' }];
    p.players[0].ground = [{ card: ids.consular, ref: 'holder', damage: 2 }];
    const { state, refs } = scenario(p);
    const pending = step(state, 'play');
    const after = attack(pending, refs.holder!, state.players.bob!.base);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(id === 'mos-eisley-modifier' ? 5 : 3);
    expect(after.cards[refs.support!]!.exhausted).toBe(true);
    expect(unitStats(after, after.cards[refs.holder!]!).power).toBe(3);
  });

for (const [id, power, heal] of [
  ['independent-smuggler', 2, 0],
  ['hera-syndulla--we-ve-lost-enough', 2, 1],
] as const)
  test(`${id}: Piloting grants its keyword only to its vehicle host`, () => {
    const p = position();
    p.players[0].base.damage = 4;
    p.players[0].space = [
      { card: 'prototype-tie-advanced', ref: 'host' },
      { card: ids.fighter, ref: 'other' },
    ];
    p.players[0].hand = [{ card: id, ref: 'pilot' }];
    p.players[0].resources = resources();
    const { state, refs } = scenario(p);
    const played = step(
      state,
      i => i.kind === 'play' && i.card === refs.pilot && i.target === refs.host,
    );
    expect(played.cards[refs.pilot!]!.attachedTo?.instanceId).toBe(refs.host);
    expect(upgrades(played, refs.other!)).toEqual([]);
    const after = attack(step(played, 'pass'), refs.host!, state.players.bob!.base);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(power + 4);
    expect(after.cards[after.players.alice!.base]!.damage).toBe(4 - heal);
  });

test("Knight's Saber permits only Jedi non-Vehicles", () => {
  const p = position();
  p.players[0].hand = [{ card: 'knight-s-saber', ref: 'saber' }];
  p.players[0].resources = resources();
  p.players[0].ground = [
    { card: ids.marine, ref: 'marine' },
    { card: 'depa-billaba--a-higher-purpose', ref: 'depa' },
  ];
  p.players[0].space = [{ card: 'jedi-starfighter', ref: 'ship' }];
  const { state, refs } = scenario(p);
  const plays = state.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'play' ? [o.intent] : [],
  );
  expect(plays.map(i => i.target)).toEqual([refs.depa!]);
  const after = step(state, 'play');
  expect(upgrades(after, refs.depa!)).toEqual(['knight-s-saber']);
});

test('Unveiled Might can be plotted onto the newly deployed leader and replaces its resource', () => {
  const p = position();
  p.players[0].resources = [...resources(), { card: 'unveiled-might', ref: 'plot' }];
  p.players[0].deck![0] = { card: ids.fighter, ref: 'replacement' };
  const { state, refs } = scenario(p);
  const declare = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  const chosen = step(declare, 'accept-effect', [refs.plot!]);
  expect(decodeState(encodeState(chosen))).toEqual(chosen);
  const after = step(
    chosen,
    i => i.kind === 'play' && i.card === refs.plot && i.target === state.players.alice!.leader,
  );
  expect(upgrades(after, state.players.alice!.leader)).toEqual(['unveiled-might']);
  expect(after.cards[refs.replacement!]!.zone).toBe('resources');
  expect(after.cards[refs.replacement!]!.exhausted).toBe(true);
});

for (const id of ['lobot--cloud-city-coordinator', 'night-wind-assailants', 'graceful-purrgil'])
  test(`${id}: Sentinel constrains its own arena and Lobot gains power from damage`, () => {
    const d = cardDefinition(id);
    if (d.kind !== 'unit') throw new Error('Unit expected');
    const p = position();
    p.players[1][d.arena] = [{ card: id, ref: 'sentinel', damage: 1 }];
    p.players[0].ground = [{ card: ids.consular, ref: 'ground' }];
    p.players[0].space = [{ card: ids.fighter, ref: 'space' }];
    const { state, refs } = scenario(p);
    const attacks = state.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent] : [],
    );
    expect(attacks.filter(i => i.attacker === refs[d.arena]).map(i => i.defender)).toEqual([
      refs.sentinel!,
    ]);
    expect(
      attacks.some(
        i =>
          i.attacker === refs[d.arena === 'ground' ? 'space' : 'ground'] &&
          i.defender === state.players.bob!.base,
      ),
    ).toBe(true);
    expect(unitStats(state, state.cards[refs.sentinel!]!).power).toBe(
      d.power + (id.startsWith('lobot--') ? 1 : 0),
    );
  });

for (const id of ['sullustan-sapper', 'depa-billaba--a-higher-purpose', 'dressellian-commandos'])
  test(`${id}: Ambush can be declined and attacks units without readying`, () => {
    const p = position();
    p.players[0].hand = [{ card: id, ref: 'ambush' }];
    p.players[0].resources = resources();
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    const pending = step(state, 'play');
    expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
      { kind: 'target', card: refs.enemy! },
      { kind: 'decline-effect' },
    ]);
    const declined = step(pending, 'decline-effect');
    expect(declined.cards[refs.ambush!]!.exhausted).toBe(true);
    expect(declined.cards[refs.enemy!]!.damage).toBe(0);
    const input = choose(pending, 'target');
    const child = Bun.spawnSync(
      [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
      {
        stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(pending), input })),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    expect(child.exitCode).toBe(0);
    expect(child.stderr.toString()).toBe('');
    expect(JSON.parse(child.stdout.toString())).toEqual(advance(pending, input));
    const after = advance(pending, input).state;
    expect(after.cards[refs.ambush!]!.exhausted).toBe(true);
    expect(after.facts.find(f => f.type === 'attacked')?.cards.map(c => c.instanceId)).toEqual([
      refs.ambush!,
      refs.enemy!,
    ]);
  });

for (const id of ['prototype-tie-advanced', 'mercenary-fleet', 'beach-patrol-at-act'])
  test(`${id}: ordinary play enters exhausted and combat uses its space or ground arena`, () => {
    const d = cardDefinition(id);
    if (d.kind !== 'unit') throw new Error('Unit expected');
    const p = position();
    p.players[0].hand = [{ card: id, ref: 'new' }];
    p.players[0].resources = resources();
    const { state, refs } = scenario(p);
    const after = step(state, 'play');
    expect(after.cards[refs.new!]!.zone).toBe(d.arena);
    expect(after.cards[refs.new!]!.exhausted).toBe(true);
    const next = nextRound(after);
    const attacked = attack(next, refs.new!, next.players.bob!.base);
    expect(attacked.cards[attacked.players.bob!.base]!.damage).toBe(d.power);
  });
