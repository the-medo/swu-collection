import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { cardDefinition } from '../cards/registry.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
function step(
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) {
  return advance(s, choose(s, i, selections)).state;
}
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function resume(s: GameState, input: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function event(card: string) {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card, ref: 'event' }];
  return p;
}

test('v8 §7.5.7: Overwhelm splits simultaneous damage; Shield prevents both the unit damage and excess', () => {
  const p = position();
  p.players[0].space = [{ card: 'mc30-assault-frigate', ref: 'attacker' }];
  p.players[1].space = [{ card: 'jedi-starfighter', ref: 'defender', damage: 1 }];
  const plain = scenario(p);
  let after = step(plain.state, i => i.kind === 'attack' && i.defender === plain.refs.defender);
  expect(after.cards[plain.refs.defender!]!.zone).toBe('discard');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(3); // 6 power, 3 remaining HP.
  expect(after.cards[plain.refs.attacker!]!.damage).toBe(1);
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'defender', ref: `shield${n}` }));
  const shielded = scenario(p);
  const choice = step(
    shielded.state,
    i => i.kind === 'attack' && i.defender === shielded.refs.defender,
  );
  expect(choice.cards[shielded.refs.attacker!]!.damage).toBe(0); // Neither combat assignment applied before replacement.
  const input = choose(choice, i => i.kind === 'target' && i.card === shielded.refs.shield2);
  resume(choice, input);
  after = advance(choice, input).state;
  expect(after.cards[after.players.bob!.base]!.damage).toBe(0);
  expect(after.cards[shielded.refs.defender!]!.damage).toBe(1);
  expect(after.cards[shielded.refs.attacker!]!.damage).toBe(1);
  expect(
    attachedUpgrades(after, after.cards[shielded.refs.defender!]!).map(c => c.instanceId),
  ).toEqual([shielded.refs.shield1!]);
  const invalid = structuredClone(choice);
  const frame = invalid.execution.frames[0];
  if (frame?.kind !== 'damage') throw new Error('Expected damage');
  frame.assignments[0]!.excess!.target = { ...frame.assignments[0]!.target };
  expect(() => decodeState(encodeState(invalid))).toThrow('excess');
});

test('Lepi Shielded creates its Shield and Overwhelm remains active during a lethal attack', () => {
  const p = event('lepi-lookout');
  const played = scenario(p);
  const entered = step(played.state, 'play');
  expect(attachedUpgrades(entered, entered.cards[played.refs.event!]!).map(c => c.cardId)).toEqual([
    'shield',
  ]);
  p.players[0].hand = [];
  p.players[0].ground = [{ card: 'lepi-lookout', ref: 'lepi' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
  const { state, refs } = scenario(p);
  const after = step(state, i => i.kind === 'attack' && i.defender === refs.defender);
  expect(after.cards[refs.lepi!]!.zone).toBe('discard');
  expect(after.cards[refs.defender!]!.zone).toBe('discard');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(2);
});

for (const cardId of [
  'bravo-squadron-fighter',
  'bith-brute',
  'fennec-shand--the-galaxy-is-dangerous',
]) {
  test(`${cardId}: Saboteur ignores Sentinel and defeats every defender Shield before combat`, () => {
    const d = cardDefinition(cardId);
    if (d.kind !== 'unit') throw new Error('Expected unit');
    const p = position();
    p.players[0][d.arena] = [{ card: cardId, ref: 'attacker' }];
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? 'droid-laser-turret' : 'outland-protector', ref: 'sentinel' },
      { card: d.arena === 'ground' ? ids.consular : 'jedi-starfighter', ref: 'target' },
    ];
    p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'target', ref: `shield${n}` }));
    const { state, refs } = scenario(p);
    expect(state.execution.decision!.options.filter(o => o.intent.kind === 'attack')).toHaveLength(
      3,
    );
    const after = step(state, i => i.kind === 'attack' && i.defender === refs.target);
    expect(after.execution.decision?.kind).toBe('action');
    expect(attachedUpgrades(after, after.cards[refs.target!]!)).toEqual([]);
    expect(after.cards[refs.target!]!.damage).toBe(d.power);
    expect(effectiveAbilities(after, after.cards[refs.sentinel!]!).keywords).toContain('Sentinel');
  });
}

test('Support lends Saboteur during declaration, and borrowed shield removal refers to the attacking copy', () => {
  const p = event('unsanctioned-patrol');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [
    { card: 'droid-laser-turret', ref: 'sentinel' },
    { card: ids.consular, ref: 'target' },
  ];
  p.attachments = [{ card: 'shield', unit: 'target' }];
  const { state, refs } = scenario(p);
  const choice = step(state, 'play');
  expect(choice.execution.decision!.options.filter(o => o.intent.kind === 'attack')).toHaveLength(
    3,
  );
  const after = step(choice, i => i.kind === 'attack' && i.defender === refs.target);
  expect(after.cards[refs.target!]!.damage).toBe(3);
  expect(attachedUpgrades(after, after.cards[refs.target!]!)).toEqual([]);
  expect(effectiveAbilities(after, after.cards[refs.attacker!]!).keywords).not.toContain(
    'Saboteur',
  );
});

test('Ascension Cable attaches only to non-Vehicles and grants Saboteur to the holder', () => {
  const p = event('ascension-cable');
  p.players[0].ground = [
    { card: ids.marine, ref: 'marine' },
    { card: 'x-34-landspeeder', ref: 'vehicle' },
  ];
  const { state, refs } = scenario(p);
  const plays = state.execution.decision!.options.map(o => o.intent).filter(i => i.kind === 'play');
  expect(plays).toEqual([{ kind: 'play', card: refs.event!, target: refs.marine! }]);
  const after = step(state, 'play');
  expect(effectiveAbilities(after, after.cards[refs.marine!]!).keywords).toContain('Saboteur');
  expect(unitStats(after, after.cards[refs.marine!]!)).toEqual({ power: 4, hp: 6 });
});

test('Cad Bane separates his exhaust action, resource-count deployment and optional unit attack ability', () => {
  const p = position();
  p.players[0].leader = { card: 'cad-bane--still-faster-than-you', ref: 'cad' };
  p.players[0].resources = resources(6);
  p.players[1].ground = [
    { card: ids.marine, ref: 'eligible' },
    { card: ids.marine, ref: 'ineligible', damage: 2 },
  ];
  const { state, refs } = scenario(p);
  const leaderChoice = step(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-unit');
  expect(leaderChoice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.eligible! },
  ]);
  expect(leaderChoice.cards[refs.cad!]!.exhausted).toBe(true);
  let after = target(leaderChoice, refs.eligible!);
  after = step(after, 'pass');
  after = step(after, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(after.cards[refs.cad!]!.deployedAs).toBe('unit');
  expect(after.cards[refs.cad!]!.exhausted).toBe(false);
  expect(after.players.alice!.resources.filter(id => after.cards[id]!.exhausted)).toHaveLength(0);
  after = step(after, 'pass');
  expect(
    after.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === refs.cad,
    ),
  ).toBe(false);
  after = step(
    after,
    i => i.kind === 'attack' && i.attacker === refs.cad && i.defender === after.players.bob!.base,
  );
  expect(after.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
    true,
  );
  after = step(after, 'decline-effect');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(4);
});

test('Aurra excludes leaders, uses remaining HP, and her deployment trigger is optional and recoverable', () => {
  const p = position();
  p.players[0].leader = { card: 'aurra-sing--assassin', ref: 'aurra' };
  p.players[0].resources = resources(7);
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit', damage: 4, ref: 'leader' };
  p.players[1].ground = [
    { card: ids.consular, ref: 'low', damage: 6 },
    { card: ids.consular, ref: 'high' },
  ];
  const { state, refs } = scenario(p);
  const choice = step(state, i => i.kind === 'use-ability' && i.abilityId === 'defeat-unit');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.low! },
  ]);
  expect(target(choice, refs.low!).cards[refs.low!]!.zone).toBe('discard');
  const deployed = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(deployed.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.low! },
    { kind: 'decline-effect' },
  ]);
  const input = choose(deployed, 'decline-effect');
  resume(deployed, input);
  expect(advance(deployed, input).state.cards[refs.low!]!.zone).toBe('ground');
  expect(target(deployed, refs.low!).cards[refs.low!]!.zone).toBe('discard');
});

for (const cardId of ['ig-2000--assassin-s-aggressor', 'b-wing-skirmisher']) {
  test(`${cardId}: multi-target damage accepts zero, rejects duplicates and applies simultaneous damage`, () => {
    const p = event(cardId);
    p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
    p.players[1].space = [{ card: 'cavern-angels-x-wing', ref: 'enemy' }];
    const { state, refs } = scenario(p);
    const choice = step(state, 'play');
    expect(choice.execution.decision!.selection!.cards.includes(refs.ground!)).toBe(
      cardId.startsWith('ig-2000'),
    );
    expect(() => step(choice, 'accept-effect', [refs.enemy!, refs.enemy!])).toThrow();
    const zero = step(choice, 'accept-effect', []);
    expect(zero.cards[refs.enemy!]!.damage).toBe(0);
    const input = choose(choice, 'accept-effect', [refs.enemy!, refs.event!]);
    resume(choice, input);
    const after = advance(choice, input).state;
    expect(after.cards[refs.event!]!.damage).toBe(1);
    expect(after.cards[refs.enemy!]!.zone).toBe('discard');
    expect(after.execution.decision?.playerId).toBe('bob');
  });
}

for (const [cardId, timing] of [
  ['tie-dagger-vanguard', 'play'],
  ['red-five--running-the-trench', 'attack'],
] as const) {
  test(`${cardId}: optional damage accepts only damaged units`, () => {
    const p = event(cardId);
    if (timing === 'attack') {
      p.players[0].hand = [];
      p.players[0].space = [{ card: cardId, ref: 'event' }];
    }
    p.players[1].ground = [
      { card: ids.consular, ref: 'damaged', damage: 1 },
      { card: ids.marine, ref: 'undamaged' },
    ];
    const { state, refs } = scenario(p);
    const choice = step(state, timing);
    expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
      { kind: 'target', card: refs.damaged! },
      { kind: 'decline-effect' },
    ]);
    expect(target(choice, refs.damaged!).cards[refs.damaged!]!.damage).toBe(3);
    expect(step(choice, 'decline-effect').cards[refs.damaged!]!.damage).toBe(1);
  });
}

for (const cardId of ['nightsister-warrior', 'ant-droid', 'swoop-bike-marauder']) {
  test(`${cardId}: draws exactly one hidden top card for its controller`, () => {
    const p = position();
    p.players[0].ground = [{ card: cardId, ref: 'source' }];
    p.players[0].deck = [{ card: ids.fighter, ref: 'drawn' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    const after = step(state, i => i.kind === 'attack' && i.defender === refs.enemy);
    expect(after.players.alice!.hand).toEqual([refs.drawn!]);
    const spectator = new Projector(after.gameId, { role: 'spectator' }).project(after);
    expect(spectator.cards.filter(c => c.zone === 'hand')).toEqual([]);
    expect(spectator.players.find(p => p.id === 'alice')!.handCount).toBe(1);
    expect(spectator.events.filter(e => e.type === 'drawn').every(e => e.cards.length === 0)).toBe(
      true,
    );
    p.players[0].deck = [];
    const empty = scenario(p);
    expect(
      step(empty.state, i => i.kind === 'attack' && i.defender === empty.refs.enemy).cards[
        empty.state.players.alice!.base
      ]!.damage,
    ).toBe(3);
  });
}

test('Resupply becomes an exhausted resource; Expendable Mercenary may return its exact defeated copy exhausted', () => {
  const resupply = scenario(event('resupply'));
  const after = step(resupply.state, 'play');
  expect(after.cards[resupply.refs.event!]!.zone).toBe('resources');
  expect(after.cards[resupply.refs.event!]!.exhausted).toBe(true);
  const p = position();
  p.players[0].ground = [
    { card: 'expendable-mercenary', ref: 'first' },
    { card: 'expendable-mercenary', ref: 'second' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const choice = step(
    state,
    i => i.kind === 'attack' && i.attacker === refs.first && i.defender === refs.enemy,
  );
  const input = choose(choice, 'accept-effect');
  resume(choice, input);
  expect(step(choice, 'decline-effect').cards[refs.first!]!.zone).toBe('discard');
  const returned = advance(choice, input).state;
  expect(returned.cards[refs.first!]!.zone).toBe('resources');
  expect(returned.cards[refs.first!]!.exhausted).toBe(true);
  expect(returned.cards[refs.second!]!.zone).toBe('ground');
});

test('removal filters distinguish Vehicles, printed costs, upgrades and deployed leaders', () => {
  for (const card of ['direct-hit', 'crushing-blow', 'lost-and-forgotten']) {
    const p = event(card);
    p.players[0].base.damage = 6;
    p.players[1].ground = [
      { card: ids.consular, ref: 'expensive' },
      { card: 'x-34-landspeeder', ref: 'vehicle' },
      { card: ids.marine, ref: 'cheap' },
    ];
    p.players[1].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
    p.attachments = [{ card: 'shield', unit: 'vehicle', ref: 'shield' }];
    const { state, refs } = scenario(p);
    const choice = step(state, 'play');
    const options = choice.execution
      .decision!.options.map(o => o.intent)
      .filter(i => i.kind === 'target')
      .map(i => i.card);
    expect(options.includes(refs.leader!)).toBe(false);
    expect(options.includes(refs.shield!)).toBe(false);
    expect(options.includes(refs.expensive!)).toBe(card === 'lost-and-forgotten');
    expect(options.includes(refs.cheap!)).toBe(card !== 'direct-hit');
    const after = target(choice, refs.vehicle!);
    expect(after.cards[refs.vehicle!]!.zone).toBe('discard');
    expect(after.cards[refs.shield!]!.zone).toBe('set-aside');
    expect(after.cards[after.players.alice!.base]!.damage).toBe(
      card === 'lost-and-forgotten' ? 3 : 6,
    );
  }
  const empty = scenario(event('lost-and-forgotten'));
  expect(step(empty.state, 'play').facts.some(f => f.type === 'healed')).toBe(false);
});

test('Hyperspace Disaster defeats both space fleets; Nebula Ignition spares upgraded units', () => {
  for (const card of ['hyperspace-disaster', 'nebula-ignition']) {
    const p = event(card);
    p.players[0].space = [{ card: ids.fighter, ref: 'friendly' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const { state, refs } = scenario(p);
    const after = step(state, 'play');
    expect(after.cards[refs.friendly!]!.zone).toBe('discard');
    expect(after.cards[refs.enemy!]!.zone).toBe(card === 'nebula-ignition' ? 'space' : 'discard');
    expect(after.cards[refs.ground!]!.zone).toBe(card === 'nebula-ignition' ? 'discard' : 'ground');
  }
});

test('Single Reactor Ignition counts defeated enemy units, including a deployed leader, before their triggers', () => {
  const p = event('single-reactor-ignition');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: 'imperial-door-technician', ref: 'enemy' }];
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
  const { state, refs } = scenario(p);
  const after = step(state, 'play');
  expect(after.cards[refs.friendly!]!.zone).toBe('discard');
  expect(after.cards[refs.leader!]!.zone).toBe('base');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(0); // Two damage, then Technician heals two.
  expect(after.facts.filter(f => f.type === 'damage').map(f => f.amount)).toEqual([1, 1]);
});

test('Operation Cinder deals own-base damage first; lethal base damage cancels its later unit effect', () => {
  const p = event('operation-cinder');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const after = step(state, 'play');
  expect(after.cards[after.players.alice!.base]!.damage).toBe(5);
  expect(after.cards[refs.friendly!]!.zone).toBe('discard');
  expect(after.cards[refs.enemy!]!.damage).toBe(5);
  p.players[0].base.damage = 25;
  const lethal = scenario(p);
  const ended = step(lethal.state, 'play');
  expect(ended.result?.winner).toBe('bob');
  expect(ended.cards[lethal.refs.friendly!]!.zone).toBe('ground');
  expect(ended.cards[lethal.refs.enemy!]!.damage).toBe(0);
});

test('No Disintegrations leaves one HP, counts upgrade HP, excludes leaders and respects Shields', () => {
  const p = event('no-disintegrations');
  p.players[1].ground = [{ card: ids.marine, ref: 'unit', damage: 1 }];
  p.attachments = [{ card: 'academy-training', unit: 'unit' }];
  const { state, refs } = scenario(p);
  const after = target(step(state, 'play'), refs.unit!);
  expect(after.cards[refs.unit!]!.damage).toBe(4); // 5 HP from printed + upgrade.
  p.attachments.push({ card: 'shield', unit: 'unit' }, { card: 'shield', unit: 'unit' });
  const shielded = scenario(p);
  const choice = target(step(shielded.state, 'play'), shielded.refs.unit!);
  expect(step(choice, 'target').cards[shielded.refs.unit!]!.damage).toBe(1);
});

test('Rebellious Hammerhead uses the remaining hand size and allows declining', () => {
  const p = event('rebellious-hammerhead');
  p.players[0].hand!.push({ card: ids.marine }, { card: ids.fighter });
  p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const { state, refs } = scenario(p);
  const choice = step(state, i => i.kind === 'play' && i.card === refs.event);
  expect(target(choice, refs.unit!).cards[refs.unit!]!.damage).toBe(2);
  expect(step(choice, 'decline-effect').cards[refs.unit!]!.damage).toBe(0);
});

test('Benthic attacks only enemy ground units with his trigger, and his defeated trigger can choose either base', () => {
  const p = position();
  p.players[0].ground = [{ card: 'benthic--two-tubes---the-war-has-just-begun', ref: 'benthic' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const choice = step(state, i => i.kind === 'attack' && i.defender === refs.enemy);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.enemy! },
  ]);
  const killed = target(choice, refs.enemy!);
  expect(killed.cards[refs.benthic!]!.zone).toBe('discard');
  expect(killed.execution.decision!.options).toHaveLength(2);
  expect(target(killed, killed.players.alice!.base).cards[killed.players.alice!.base]!.damage).toBe(
    1,
  );
});

test('Cavern Angels X-Wing offers either base for its mandatory defeat damage', () => {
  const p = position();
  p.players[0].space = [{ card: 'cavern-angels-x-wing', ref: 'cavern' }];
  p.players[1].space = [{ card: 'mc30-assault-frigate', ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const choice = step(state, i => i.kind === 'attack' && i.defender === refs.enemy);
  expect(choice.execution.decision!.options).toHaveLength(2);
  expect(target(choice, choice.players.bob!.base).cards[choice.players.bob!.base]!.damage).toBe(2);
});

test('Overwhelm deals full combat damage after the defender leaves and returns as a different incarnation', () => {
  const p = event('migs-mayfeld--how-about-a-toast-');
  p.players[0].leader = { card: 'cad-bane--still-faster-than-you', deployedAs: 'unit', ref: 'cad' };
  p.players[1].ground = [{ card: 'superlaser-technician', ref: 'tech' }];
  const { state, refs } = scenario(p);
  let choice = step(
    step(state, 'play'),
    i => i.kind === 'attack' && i.attacker === refs.cad && i.defender === refs.tech,
  );
  const batch = choice.execution.frames[0];
  if (batch?.kind !== 'trigger-batch') throw new Error('Expected attack triggers');
  const borrowed = batch.triggers.find(t => t.abilityId !== 'on-attack')!;
  choice = step(choice, i => i.kind === 'trigger' && i.triggerId === borrowed.id);
  expect(choice.execution.decision!.playerId).toBe('bob');
  expect(choice.execution.decision!.options.some(o => o.intent.kind === 'accept-effect')).toBe(
    true,
  );
  resume(choice, choose(choice, 'accept-effect'));
  choice = step(choice, 'accept-effect');
  const after = step(choice, 'decline-effect');
  expect(after.cards[refs.tech!]!.zone).toBe('resources');
  expect(after.cards[refs.tech!]!.incarnation).toBe(state.cards[refs.tech!]!.incarnation + 1);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(4);
  expect(after.cards[refs.cad!]!.damage).toBe(0);
});
