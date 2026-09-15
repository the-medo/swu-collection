import { expect, test } from 'bun:test';
import pins from './fixtures/meta-foundations.json';
import { cardDefinition } from '../cards/registry.ts';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

function step(s: GameState, intent: Intent['kind'] | ((i: Intent) => boolean)) {
  return advance(s, choose(s, intent)).state;
}

// Shared vanilla rules are exercised for every new printed stat/arena binding.
for (const [cardId, pin] of Object.entries(pins)) {
  const definition = cardDefinition(cardId);
  if (definition.kind !== 'unit' || pin.text) continue;
  test(`${cardId}: enters exhausted and deals its printed power in its arena`, () => {
    const p = position();
    p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
    p.players[0].hand = [{ card: cardId, ref: 'played' }];
    const { state: before, refs } = scenario(p);
    const played = step(before, 'play');
    expect(played.cards[refs.played!]!.zone).toBe(definition.arena);
    expect(played.cards[refs.played!]!.exhausted).toBe(true);
    p.players[0].hand = [];
    p.players[0][definition.arena] = [{ card: cardId, ref: 'attacker' }];
    const ready = scenario(p);
    const after = step(
      ready.state,
      i => i.kind === 'attack' && i.defender === ready.state.players.bob!.base,
    );
    expect(after.cards[after.players.bob!.base]!.damage).toBe(definition.power);
    expect(after.cards[ready.refs.attacker!]!.exhausted).toBe(true);
  });
}

for (const cardId of ['pirate-snub-fighter', 'eager-escort-fighter', 'x-34-landspeeder']) {
  test(`${cardId}: optional v8 Ambush attacks a unit while remaining exhausted`, () => {
    const d = cardDefinition(cardId);
    if (d.kind !== 'unit') throw new Error('Expected unit');
    const p = position();
    p.players[0].hand = [{ card: cardId, ref: 'ambusher' }];
    p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
    p.players[1][d.arena] = [
      { card: d.arena === 'space' ? 'jedi-starfighter' : ids.consular, ref: 'enemy' },
    ];
    const { state: initial, refs } = scenario(p);
    const choice = step(initial, 'play');
    expect(choice.execution.decision!.options.map(o => o.intent.kind)).toEqual([
      'target',
      'decline-effect',
    ]);
    expect(step(choice, 'decline-effect').cards[refs.ambusher!]!.exhausted).toBe(true);
    const attacked = step(choice, 'target');
    expect(attacked.facts.find(f => f.type === 'attacked')!.cards.map(c => c.instanceId)).toEqual([
      refs.ambusher!,
      refs.enemy!,
    ]);
    expect(attacked.cards[refs.ambusher!]!.exhausted).toBe(true);
    expect(attacked.cards[attacked.players.bob!.base]!.damage).toBe(0);
  });
}

for (const cardId of [
  'droid-laser-turret',
  'black-sun-patroller',
  'secretive-sage',
  'han-solo--hibernation-sick',
]) {
  test(`${cardId}: playing creates one Shield on the exact new copy`, () => {
    const p = position();
    p.players[0].hand = [{ card: cardId, ref: 'new' }];
    p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.marine, ref: 'other' }];
    const { state, refs } = scenario(p);
    const after = step(state, 'play');
    expect(attachedUpgrades(after, after.cards[refs.new!]!).map(c => c.cardId)).toEqual(['shield']);
    expect(attachedUpgrades(after, after.cards[refs.other!]!)).toEqual([]);
  });
}

for (const cardId of [
  'droid-laser-turret',
  'outland-protector',
  'supremacy-tie-sf',
  'contracted-jumpmaster',
]) {
  test(`${cardId}: Sentinel restricts only attacks in its own arena`, () => {
    const d = cardDefinition(cardId);
    if (d.kind !== 'unit') throw new Error('Expected unit');
    const p = position();
    p.players[1][d.arena] = [{ card: cardId, ref: 'sentinel' }];
    p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
    p.players[0].space = [{ card: ids.fighter, ref: 'space' }];
    const { state, refs } = scenario(p);
    const attacks = state.execution
      .decision!.options.map(o => o.intent)
      .filter(i => i.kind === 'attack');
    expect(attacks.find(i => i.attacker === refs[d.arena])!.defender).toBe(refs.sentinel!);
    expect(
      attacks.find(i => i.attacker === refs[d.arena === 'space' ? 'ground' : 'space'])!.defender,
    ).toBe(state.players.bob!.base);
  });
}

test('Honnah heals its own base and Raid adds power only during its attack; A-Wing has Raid 1', () => {
  for (const [cardId, expectedDamage, expectedHeal] of [
    ['honnah--oink--squee-', 5, 2],
    ['a-wing', 2, 0],
  ] as const) {
    const d = cardDefinition(cardId);
    if (d.kind !== 'unit') throw new Error('Expected unit');
    const p = position();
    p.players[0][d.arena] = [{ card: cardId, ref: 'attacker' }];
    p.players[0].base.damage = 5;
    const { state, refs } = scenario(p);
    const after = step(state, 'attack');
    expect(after.cards[after.players.bob!.base]!.damage).toBe(expectedDamage);
    expect(after.cards[after.players.alice!.base]!.damage).toBe(5 - expectedHeal);
    expect(unitStats(after, after.cards[refs.attacker!]!).power).toBe(d.power);
  }
});

test('Han gains Experience before combat, keeping the token on the attacking physical copy', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'han-solo--hibernation-sick', ref: 'han' },
    { card: ids.marine, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  const after = step(state, i => i.kind === 'attack' && i.attacker === refs.han);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(2);
  expect(attachedUpgrades(after, after.cards[refs.han!]!).map(c => c.cardId)).toEqual([
    'experience',
  ]);
  expect(attachedUpgrades(after, after.cards[refs.other!]!)).toEqual([]);
});

test('Imperial Door Technician heals its controller after simultaneous combat defeat', () => {
  const p = position();
  p.players[0].ground = [{ card: 'imperial-door-technician', ref: 'tech' }];
  p.players[1].ground = [{ card: ids.marine }];
  p.players[0].base.damage = 1;
  p.players[1].base.damage = 5;
  const { state, refs } = scenario(p);
  const after = step(state, i => i.kind === 'attack' && i.defender !== state.players.bob!.base);
  expect(after.cards[refs.tech!]!.zone).toBe('discard');
  expect(after.cards[after.players.alice!.base]!.damage).toBe(0);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(5);
});

test('Jedi Starfighter may choose any space unit, including itself; suspended attack resumes in a fresh process', () => {
  const p = position();
  p.players[0].space = [{ card: 'jedi-starfighter', ref: 'jedi' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  const { state, refs } = scenario(p);
  const choice = step(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.jedi! },
    { kind: 'target', card: refs.enemy! },
    { kind: 'decline-effect' },
  ]);
  expect(step(choice, 'decline-effect').cards[refs.jedi!]!.damage).toBe(0);
  const input = choose(choice, i => i.kind === 'target' && i.card === refs.jedi);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(choice), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  const after = advance(choice, input);
  expect(JSON.parse(child.stdout.toString())).toEqual(after);
  expect(after.state.cards[refs.jedi!]!.damage).toBe(1);
  expect(after.state.cards[after.state.players.bob!.base]!.damage).toBe(1);
});
