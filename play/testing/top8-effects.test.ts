import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = (n = 20) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const mode = (s: GameState, mode: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === mode);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
  return p;
}
function triggers(s: GameState) {
  while (s.execution.decision?.kind === 'trigger') s = step(s, 'trigger');
  return s;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  expect(decodeState(encodeState(s))).toEqual(s);
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
function regroup(s: GameState) {
  const round = s.round;
  for (let i = 0; i < 40 && s.round === round; i++) {
    const d = s.execution.decision!;
    const o =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === o.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  return s;
}

test('Talzin pays Force and exhaustion only on her leader face; her unit weakens without those costs', () => {
  const p = position();
  p.players[0].leader = { card: 'mother-talzin--power-through-magick', ref: 'talzin' };
  p.players[0].force = true;
  p.players[0].resources = resources(5);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const pending = step(state, i => i.kind === 'use-ability' && i.abilityId === 'weaken');
  expect(forceToken(pending, 'alice')).toBeUndefined();
  expect(pending.cards[refs.talzin!]!.exhausted).toBe(true);
  resume(pending, choose(pending, 'target'));
  const after = target(pending, refs.enemy!);
  expect(unitStats(after, after.cards[refs.enemy!]!)).toMatchObject({ power: 2, hp: 2 });
  const deployed = step(
    step(after, 'pass'),
    i => i.kind === 'use-ability' && i.abilityId === 'deploy',
  );
  expect(deployed.cards[refs.talzin!]!.deployedAs).toBe('unit');
  expect(deployed.players.alice!.resources.every(id => !deployed.cards[id]!.exhausted)).toBe(true);
  const attackChoice = attack(step(deployed, 'pass'), refs.talzin!, state.players.bob!.base);
  const weakened = target(attackChoice, refs.enemy!);
  expect(unitStats(weakened, weakened.cards[refs.enemy!]!)).toMatchObject({ power: 1, hp: 1 });
  const next = regroup(weakened);
  expect(unitStats(next, next.cards[refs.enemy!]!)).toMatchObject({ power: 3, hp: 3 });
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'weaken',
    ),
  ).toBe(false);
});

test('Chirrut preserves the exact attacker through Force payment and expires its penalty after combat', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].force = true;
  p.players[1].ground = [
    { card: 'chirrut--mwe--blind--but-not-deaf', ref: 'chirrut' },
    { card: ids.consular, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  const pending = attack(state, refs.attacker!, refs.chirrut!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  resume(pending, choose(pending, 'accept-effect'));
  const after = step(pending, 'accept-effect');
  expect(after.cards[refs.chirrut!]!.damage).toBe(1);
  expect(forceToken(after, 'bob')).toBeUndefined();
  expect(after.lastingEffects).toEqual([]);
  expect(after.cards[refs.other!]!.damage).toBe(0);
  const declined = step(pending, 'decline-effect');
  expect(declined.cards[refs.chirrut!]!.damage).toBe(3);
  expect(!!forceToken(declined, 'bob')).toBe(true);
});

test('Luke heals the exact attacker on his leader face and chooses between it and his base while deployed', () => {
  const p = position();
  p.players[0].leader = { card: 'luke-skywalker--i-can-save-him', ref: 'luke' };
  p.players[0].ground = [
    { card: ids.consular, ref: 'attacker', damage: 3 },
    { card: ids.consular, ref: 'other', damage: 3 },
  ];
  p.players[0].base.damage = 5;
  const { state, refs } = scenario(p);
  const pending = attack(state, refs.attacker!, state.players.bob!.base);
  resume(pending, choose(pending, 'accept-effect'));
  const after = step(pending, 'accept-effect');
  expect(after.cards[refs.luke!]!.exhausted).toBe(true);
  expect(after.cards[refs.attacker!]!.damage).toBe(2);
  expect(after.cards[refs.other!]!.damage).toBe(3);
  p.players[0].leader.deployedAs = 'unit';
  const deployed = scenario(p);
  const healing = attack(deployed.state, deployed.refs.attacker!, deployed.state.players.bob!.base);
  expect(mode(healing, 'heal-attacker').cards[deployed.refs.attacker!]!.damage).toBe(1);
  expect(mode(healing, 'heal-base').cards[deployed.state.players.alice!.base]!.damage).toBe(3);
  expect(mode(healing, 'heal-base').cards[deployed.refs.luke!]!.exhausted).toBe(false);
});

test('Jam Communications privately inspects the opponent hand and discards only an event', () => {
  const p = playFixture('jam-communications');
  p.players[1].hand = [
    { card: 'open-fire', ref: 'event' },
    { card: ids.marine, ref: 'unit' },
  ];
  const { state, refs } = scenario(p);
  const pending = step(state, 'play');
  expect(pending.execution.decision!.selection!.cards).toEqual([refs.event!]);
  const view = new Projector(state.gameId, { role: 'spectator' }).project(pending);
  expect(view.decision).toBeNull();
  expect(JSON.stringify(view)).not.toContain('open-fire');
  resume(pending, choose(pending, 'accept-effect', [refs.event!]));
  const after = step(pending, 'accept-effect', [refs.event!]);
  expect(after.cards[refs.event!]!.zone).toBe('discard');
  expect(after.cards[refs.unit!]!.zone).toBe('hand');
});

test('Jod pays four additional resources to exhaust every unit in only the chosen arena', () => {
  const p = playFixture('jod-na-nawood--keeping-secrets');
  p.players[0].space = [{ card: ids.fighter, ref: 'own' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  const { state, refs } = scenario(p);
  const pending = step(state, 'play');
  const spent = pending.players.alice!.resources.filter(id => pending.cards[id]!.exhausted).length;
  const choice = step(pending, 'accept-effect');
  resume(
    choice,
    choose(choice, i => i.kind === 'choose-mode' && i.mode === 'space'),
  );
  const after = mode(choice, 'space');
  expect(after.players.alice!.resources.filter(id => after.cards[id]!.exhausted)).toHaveLength(
    spent + 4,
  );
  expect(after.cards[refs.own!]!.exhausted && after.cards[refs.enemy!]!.exhausted).toBe(true);
  expect(after.cards[refs.ground!]!.exhausted).toBe(false);
  expect(step(pending, 'decline-effect').cards[refs.enemy!]!.exhausted).toBe(false);
});

test('AT-ST Raider requires another nonunique friendly unit for Ambush', () => {
  for (const [ally, expected] of [
    [ids.marine, true],
    ['shin-hati--overeager-apprentice', false],
    [null, false],
  ] as const) {
    const p = playFixture('at-st-raider');
    p.players[0].ground = ally ? [{ card: ally }] : [];
    p.players[1].ground = [{ card: ids.consular }];
    const after = step(scenario(p).state, 'play');
    expect(after.execution.decision!.options.some(o => o.intent.kind === 'target')).toBe(expected);
  }
});

test('Fulminatrix offers ground damage on play and attack; Bendu damages every other unit simultaneously', () => {
  const p = playFixture('fulminatrix--fleet-killer');
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const { state, refs } = scenario(p);
  const pending = step(state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.ground! },
    { kind: 'decline-effect' },
  ]);
  const after = target(pending, refs.ground!);
  expect(after.cards[refs.ground!]!.damage).toBe(4);
  const next = regroup(after);
  expect(
    attack(next, refs.played!, next.players.bob!.base).execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.ground,
    ),
  ).toBe(true);
  const b = position();
  b.players[0].ground = [
    { card: 'bendu--do-you-fear-the-storm-', ref: 'bendu' },
    { card: ids.marine, ref: 'own' },
  ];
  b.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  b.players[1].space = [{ card: ids.fighter, ref: 'ship' }];
  const setup = scenario(b);
  const storm = attack(setup.state, setup.refs.bendu!, setup.state.players.bob!.base);
  for (const id of ['own', 'enemy', 'ship'])
    expect(storm.cards[setup.refs[id]!]!.zone).toBe('discard');
  expect(storm.cards[setup.refs.bendu!]!.damage).toBe(0);
});

test('DRK-1 removes nonunique upgrades and excludes unique upgrades', () => {
  const p = playFixture('drk-1-probe-droid');
  p.players[1].ground = [{ card: 'shin-hati--overeager-apprentice', ref: 'host' }];
  p.attachments = [
    { card: 'shield', unit: 'host', ref: 'shield' },
    { card: 'the-darksaber--icon-of-leadership', unit: 'host', ref: 'unique' },
  ];
  const { state, refs } = scenario(p);
  const pending = step(state, 'play');
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.unique,
    ),
  ).toBe(false);
  const after = target(pending, refs.shield!);
  expect(upgrades(after, refs.host!)).toEqual(['the-darksaber--icon-of-leadership']);
});

test('Leia Support uses the attacking holder for self-damage, including Shield replacement', () => {
  const p = playFixture('leia-organa--vigilant-for-danger');
  p.players[0].ground = [{ card: ids.consular, ref: 'holder' }];
  p.players[0].base.damage = 4;
  p.attachments = [{ card: 'shield', unit: 'holder' }];
  const { state, refs } = scenario(p);
  const pending = attack(step(state, 'play'), refs.holder!, state.players.bob!.base);
  const after = mode(pending, 'heal');
  expect(after.cards[refs.holder!]!.damage).toBe(0);
  expect(upgrades(after, refs.holder!)).toEqual([]);
  expect(after.cards[after.players.alice!.base]!.damage).toBe(2);
  expect(after.cards[refs.played!]!.damage).toBe(0);
});

test('One Must Destroy to Create plays only the exact defeated unit for free as a new incarnation', () => {
  const p = playFixture('one-must-destroy-to-create');
  p.players[0].ground = [{ card: ids.marine, ref: 'unit', damage: 2 }];
  p.players[0].discard = [{ card: ids.marine, ref: 'other' }];
  const { state, refs } = scenario(p);
  const pending = target(step(state, 'play'), refs.unit!);
  expect(
    pending.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'play' ? [o.intent.card] : [],
    ),
  ).toEqual([refs.unit!]);
  resume(pending, choose(pending, 'play'));
  const after = step(pending, 'play');
  expect(after.cards[refs.unit!]!).toMatchObject({
    zone: 'ground',
    damage: 0,
    exhausted: true,
    incarnation: state.cards[refs.unit!]!.incarnation + 1,
  });
  expect(after.cards[refs.other!]!.zone).toBe('discard');
});

test('Razor Crest may discard an exact hand card for a temporary attack bonus', () => {
  const p = position();
  p.players[0].space = [{ card: 'razor-crest--outfitted-armament', ref: 'crest' }];
  p.players[0].hand = [{ card: ids.marine, ref: 'discard' }];
  const { state, refs } = scenario(p);
  const pending = triggers(attack(state, refs.crest!, state.players.bob!.base));
  const after = step(pending, 'accept-effect', [refs.discard!]);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(5);
  expect(after.cards[refs.discard!]!.zone).toBe('discard');
  expect(unitStats(after, after.cards[refs.crest!]!).power).toBe(3);
});

for (const id of ['preparation', 'cybernetic-enhancements', 'durasteel-plating'])
  test(`${id}: its play effect belongs to the upgrade while affecting the exact host`, () => {
    const p = playFixture(id);
    p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
    const { state, refs } = scenario(p);
    const after = step(state, i => i.kind === 'play' && i.target === refs.host);
    if (id === 'preparation') expect(after.cards[refs.host!]!.exhausted).toBe(true);
    if (id === 'cybernetic-enhancements') expect(after.players.alice!.hand).toHaveLength(1);
    if (id === 'durasteel-plating') expect(upgrades(after, refs.host!)).toContain('shield');
  });

test('Bog Down preserves the first unit binding through Disclose and requires a different second unit', () => {
  const p = playFixture('bog-down-in-procedure');
  p.players[0].hand!.push({ card: 'jam-communications', ref: 'disclose' });
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
  ];
  const { state, refs } = scenario(p);
  const disclosure = target(
    step(state, i => i.kind === 'play' && i.card === refs.played),
    refs.one!,
  );
  const pending = step(disclosure, 'accept-effect', [refs.disclose!]);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.two! },
  ]);
  resume(pending, choose(pending, 'target'));
  const after = target(pending, refs.two!);
  expect(after.cards[refs.one!]!.exhausted && after.cards[refs.two!]!.exhausted).toBe(true);
});

test('Get Lost excludes leaders and unupgraded units', () => {
  const p = playFixture('get-lost');
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].ground = [
    { card: ids.consular, ref: 'unit' },
    { card: ids.marine, ref: 'bare' },
  ];
  p.attachments = [{ card: 'shield', unit: 'unit' }];
  const { state, refs } = scenario(p);
  const pending = step(state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.unit! },
  ]);
  expect(target(pending, refs.unit!).cards[refs.unit!]!.zone).toBe('discard');
});

for (const [id, reduction] of [
  ['morgan-elsbeth--life-abandoned', 2],
  ['desperate-commando', 1],
] as const)
  test(`${id}: a defeated source still gives the chosen unit its phase penalty`, () => {
    const p = playFixture('open-fire');
    p.players[0].ground = [{ card: id, ref: 'source', damage: id.startsWith('morgan') ? 3 : 0 }];
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    const { state, refs } = scenario(p);
    const pending = target(step(state, 'play'), refs.source!);
    const after = target(pending, refs.target!);
    expect(after.cards[refs.source!]!.zone).toBe('discard');
    expect(unitStats(after, after.cards[refs.target!]!)).toMatchObject({
      power: 3 - reduction,
      hp: 7 - reduction,
    });
  });

test('The Legacy Run divides six damage only among enemy units after defeat', () => {
  const p = playFixture('open-fire');
  p.players[0].space = [{ card: 'the-legacy-run--doomed-debris', ref: 'legacy' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.consular, ref: 'two' },
  ];
  const { state, refs } = scenario(p);
  const pending = target(step(state, 'play'), refs.legacy!);
  const selection = [refs.one!, refs.one!, refs.two!, refs.two!, refs.two!, refs.two!];
  resume(pending, choose(pending, 'accept-effect', selection));
  const after = step(pending, 'accept-effect', selection);
  expect(after.cards[refs.one!]!.damage).toBe(2);
  expect(after.cards[refs.two!]!.damage).toBe(4);
});

test('Cham resources the top card only while behind in resource count', () => {
  for (const [enemy, expected] of [
    [20, false],
    [21, true],
  ] as const) {
    const p = playFixture('cham-syndulla--rallying-ryloth');
    p.players[1].resources = resources(enemy);
    p.players[0].deck![0] = { card: ids.fighter, ref: 'top' };
    const { state, refs } = scenario(p);
    let after = step(state, 'play');
    if (expected) after = step(after, 'accept-effect');
    expect(after.cards[refs.top!]!.zone).toBe(expected ? 'resources' : 'deck');
    if (expected) expect(after.cards[refs.top!]!.exhausted).toBe(true);
  }
});

test('Charged with Corruption captures only after the full double-Command disclosure', () => {
  const p = playFixture('charged-with-corruption');
  p.players[0].hand!.push({ card: ids.marine, ref: 'first' }, { card: ids.marine, ref: 'second' });
  p.players[0].ground = [{ card: ids.marine, ref: 'guard' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'prisoner' }];
  const { state, refs } = scenario(p);
  const disclosure = step(state, i => i.kind === 'play' && i.card === refs.played);
  expect(() => step(disclosure, 'accept-effect', [refs.first!])).toThrow();
  const guard = step(disclosure, 'accept-effect', [refs.first!, refs.second!]);
  const pending = target(guard, refs.guard!);
  const after = target(pending, refs.prisoner!);
  expect(after.cards[refs.prisoner!]!.zone).toBe('captured');
  expect(after.cards[refs.prisoner!]!.capturedBy?.instanceId).toBe(refs.guard);
});

test('Contracted Hunter is defeated at regroup; Fireball takes damage instead and can consume its Shield', () => {
  const p = position();
  p.players[0].ground = [{ card: 'contracted-hunter', ref: 'hunter' }];
  p.players[0].space = [{ card: 'fireball--an-explosion-with-wings', ref: 'fireball' }];
  p.attachments = [
    { card: 'shield', unit: 'hunter' },
    { card: 'shield', unit: 'fireball' },
  ];
  const { state, refs } = scenario(p);
  const after = regroup(state);
  expect(after.cards[refs.hunter!]!.zone).toBe('discard');
  expect(after.cards[refs.fireball!]!.zone).toBe('space');
  expect(after.cards[refs.fireball!]!.damage).toBe(0);
  expect(upgrades(after, refs.fireball!)).toEqual([]);
});

test('Grassroots Resistance heals its own base after damage, including when that damage is Shielded', () => {
  const p = playFixture('grassroots-resistance');
  p.players[0].base.damage = 4;
  p.players[1].ground = [{ card: ids.marine, ref: 'unit' }];
  p.attachments = [{ card: 'shield', unit: 'unit' }];
  const { state, refs } = scenario(p);
  const after = target(step(state, 'play'), refs.unit!);
  expect(after.cards[refs.unit!]!.damage).toBe(0);
  expect(after.cards[after.players.alice!.base]!.damage).toBe(1);
});

for (const id of ['yoda-s-lightsaber', 'itinerant-warrior'])
  test(`${id}: optional Force payment allows either base to be healed`, () => {
    const p = playFixture(id);
    p.players[0].force = true;
    p.players[1].base.damage = 4;
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    const { state, refs } = scenario(p);
    let pending = triggers(step(state, 'play'));
    pending = step(pending, 'accept-effect');
    const after = target(pending, state.players.bob!.base);
    expect(after.cards[after.players.bob!.base]!.damage).toBe(1);
    expect(forceToken(after, 'alice')).toBeUndefined();
    if (id === 'itinerant-warrior')
      expect(upgrades(triggers(after), refs.played!)).toEqual(['shield']);
  });

test('Jedi Consular pays Force/exhaustion before discounted unit play and excludes Pilot upgrade play', () => {
  const p = position();
  p.players[0].ground = [{ card: 'jedi-consular', ref: 'consular' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].force = true;
  p.players[0].resources = resources(1);
  p.players[0].hand = [{ card: ids.marine, ref: 'unit' }, { card: 'independent-smuggler' }];
  const { state, refs } = scenario(p);
  const pending = step(state, i => i.kind === 'use-ability' && i.abilityId === 'force-play');
  expect(pending.cards[refs.consular!]!.exhausted).toBe(true);
  expect(forceToken(pending, 'alice')).toBeUndefined();
  expect(
    pending.execution.decision!.options.some(o => o.intent.kind === 'play' && !!o.intent.piloting),
  ).toBe(false);
  const after = step(pending, i => i.kind === 'play' && i.card === refs.unit);
  expect(after.cards[refs.unit!]!.zone).toBe('ground');
  expect(after.players.alice!.resources.every(id => !after.cards[id]!.exhausted)).toBe(true);
});

test('Maz grants a Force unit a two-power attack without granting it to other traits', () => {
  const p = playFixture('maz-kanata--the-light-guides');
  p.players[0].ground = [
    { card: 'secretive-sage', ref: 'force' },
    { card: ids.marine, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  const pending = step(state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.force! },
    { kind: 'decline-effect' },
  ]);
  const attacking = target(pending, refs.force!);
  const after = step(attacking, 'attack');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(4);
  expect(unitStats(after, after.cards[refs.force!]!).power).toBe(2);
});

test('Persecutor chooses an arena and may decline its simultaneous damage', () => {
  const p = playFixture('persecutor--fire-over-scarif');
  p.players[0].ground = [{ card: ids.consular, ref: 'own' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const pending = mode(step(state, 'play'), 'ground');
  expect(mode(pending, 'decline').cards[refs.own!]!.damage).toBe(0);
  const after = mode(pending, 'damage');
  expect(after.cards[refs.own!]!.damage).toBe(3);
  expect(after.cards[refs.enemy!]!.damage).toBe(3);
  expect(after.cards[refs.played!]!.damage).toBe(0);
});

test('Talzin cannot activate without Force; reducing HP defeats a Shielded unit without damage', () => {
  const p = position();
  p.players[0].leader.card = 'mother-talzin--power-through-magick';
  p.players[1].space = [{ card: ids.fighter, ref: 'target' }];
  p.attachments = [{ card: 'shield', unit: 'target' }];
  const noForce = scenario(p);
  expect(
    noForce.state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'weaken',
    ),
  ).toBe(false);
  p.players[0].force = true;
  const { state, refs } = scenario(p);
  const after = target(
    step(state, i => i.kind === 'use-ability' && i.abilityId === 'weaken'),
    refs.target!,
  );
  expect(after.cards[refs.target!]!.zone).toBe('discard');
  expect(
    after.facts.some(f => f.type === 'damage' && f.cards.some(c => c.instanceId === refs.target)),
  ).toBe(false);
});

test('Luke cannot heal a defeated attacker or substitute another copy, and his deployment is a separate Epic Action', () => {
  const p = position();
  p.players[0].leader = { card: 'luke-skywalker--i-can-save-him', ref: 'luke' };
  p.players[0].resources = resources(7);
  p.players[0].ground = [
    { card: ids.marine, ref: 'attacker' },
    { card: ids.marine, ref: 'other', damage: 2 },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const pending = attack(state, refs.attacker!, refs.enemy!);
  const after = step(pending, 'accept-effect');
  expect(after.cards[refs.attacker!]!.zone).toBe('discard');
  expect(after.cards[refs.other!]!.damage).toBe(2);
  const deployed = step(
    step(after, 'pass'),
    i => i.kind === 'use-ability' && i.abilityId === 'deploy',
  );
  expect(deployed.cards[refs.luke!]!).toMatchObject({ deployedAs: 'unit', exhausted: false });
  expect(deployed.players.alice!.resources.every(id => !deployed.cards[id]!.exhausted)).toBe(true);
});

test('Jam has no discard choice without an event; Bog Down can disclose on an empty board', () => {
  const p = playFixture('jam-communications');
  p.players[1].hand = [{ card: ids.marine, ref: 'unit' }];
  const s = scenario(p);
  const pending = step(s.state, 'play');
  expect(pending.execution.decision!.selection!.cards).toEqual([]);
  const after = step(pending, 'accept-effect');
  expect(after.cards[s.refs.unit!]!.zone).toBe('hand');
  const b = playFixture('bog-down-in-procedure');
  b.players[0].hand!.push({ card: 'jam-communications', ref: 'disclosed' });
  const g = scenario(b);
  const choice = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
  expect(choice.execution.frames[0]!.kind).toBe('disclose');
  const disclosed = step(choice, 'accept-effect', [g.refs.disclosed!]);
  expect(
    disclosed.facts.some(
      f => f.type === 'revealed' && f.cards.some(c => c.instanceId === g.refs.disclosed),
    ),
  ).toBe(true);
});

test('Jod cannot buy the arena effect without four remaining resources', () => {
  const p = playFixture('jod-na-nawood--keeping-secrets');
  p.players[0].resources = resources(7); // Three printed cost plus two Cunning penalty; two remain.
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const after = step(state, 'play');
  expect(after.execution.decision!.playerId).toBe('bob');
  expect(after.cards[refs.enemy!]!.exhausted).toBe(false);
});
