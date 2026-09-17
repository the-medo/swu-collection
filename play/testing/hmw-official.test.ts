import previewIdRecording from './fixtures/replay-compatibility/hmw-preview-ids.json';
import { validateCatalog } from '../cards/validate.ts';
import { stateDigest } from '../storage/integrity.ts';
import { expect, test } from 'bun:test';
import { cardDefinition as definition } from '../cards/registry.ts';
import { bundledCatalog, registerCatalog, versionsFor, cardDefinition } from '../cards/catalog.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { cardTraits } from '../engine/attributes.ts';
import { effectiveAbilities, hasUnitAbilities } from '../engine/effective-abilities.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { matchesCard } from '../engine/inspection.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { numericValue } from '../engine/values.ts';
import { matchingUpgrades } from '../engine/upgrade-selection.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { GameState, Intent } from '../engine/model.ts';
import type { ScenarioInput } from './scenario.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = (n = 20) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  intent: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(decodeState(encodeState(s)), choose(s, intent, selections)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const beasts = (s: GameState) => s.ground.map(id => s.cards[id]!).filter(c => c.cardId === 'beast');
const tokens = (s: GameState, id: string, token = 'weakness') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === token);
function play(id: string, configure: (p: ScenarioInput) => void = () => {}) {
  const p = position('hmw-official');
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: id, ref: 'source' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  configure(p);
  const g = scenario(p);
  const card = definition(id);
  const s = step(
    g.state,
    i =>
      i.kind === 'play' &&
      i.card === g.refs.source &&
      (card.kind !== 'upgrade' ||
        i.target === (card.attachTo === 'base' ? g.state.players.alice!.base : g.refs.friendly)),
  );
  return { s, refs: g.refs };
}
function effects(s: GameState, source: string, list: readonly CardEffect[]) {
  const next = structuredClone(s);
  next.execution.decision = null;
  next.execution.frames = [
    ...effectFrames(next.cards[source]!.controller, next.cards[source]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(next);
  return next;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}

test('all 275 official HMW identities are playable, including the corrected IDs and reprints', async () => {
  const official = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const cards = Object.values(official).filter((c: any) =>
    Object.values(c.variants).some((v: any) => v.set === 'hmw'),
  ) as { cardId: string }[];
  expect(cards).toHaveLength(275);
  for (const c of cards) expect(() => definition(c.cardId)).not.toThrow();
  expect(() => definition('garnac--let-the-hunt-begin')).toThrow();
  expect(() => definition('stormtrooper-patrol--')).toThrow();
  expect(bundledCatalog.data.requiredEngine).toBe('1.2.0');
});

test('installed catalogs keep historical preview IDs without aliasing new game identities', () => {
  const old = registerCatalog(validateCatalog(previewIdRecording.catalog));
  const context = { versions: versionsFor(old) };
  expect(cardDefinition(context, 'stormtrooper-patrol--').kind).toBe('unit');
  expect(() => cardDefinition(context, 'stormtrooper-patrol')).toThrow();
  expect(
    cardDefinition({ versions: versionsFor(bundledCatalog) }, 'stormtrooper-patrol').kind,
  ).toBe('unit');
});

test.each([
  ['territorial-mudhorn', ['Sentinel'], 0, 0],
  ['secessionist-convert', [], 1, 1],
  ['auzituck-avenger', [], 2, 2],
  ['tibidee-mate', [], 0, 1],
  ['flock-of-mynocks', ['Overwhelm'], 0, 0],
  ['outer-rim-garrison', ['Ambush', 'Overwhelm'], 0, 0],
  ['corpo-thugs', ['Saboteur'], 2, 0],
  ['dune-sea-nomads', [], 3, 0],
  ['feisty-blurrg', ['Grit'], 0, 0],
  ['tusken-bantha-rider', [], 4, 0],
  ['nightsister-prodigy', ['Hidden', 'Overwhelm'], 0, 0],
  ['dathomiri-rancor', ['Hidden'], 0, 0],
  ['treacherous-pyke', ['Ambush', 'Saboteur'], 0, 0],
  ['clever-trapper', ['Ambush'], 0, 0],
  ['tusken-raider', [], 3, 0],
  ['horizon-chaser', [], 2, 0],
  ['trandoshan-collaborator', ['Saboteur'], 3, 0],
  ['friendly-eopie', [], 0, 2],
] as const)('%s uses the printed shared keyword mechanics', (id, keywords, raid, restore) => {
  const p = position();
  const d = definition(id);
  if (d.kind !== 'unit') throw new Error('Unit expected');
  p.players[0][d.arena] = [{ card: id, ref: 'unit' }];
  const { state, refs } = scenario(p);
  const a = effectiveAbilities(state, state.cards[refs.unit!]!);
  expect([...a.keywords!].sort()).toEqual([...keywords].sort());
  expect(a.raid).toBe(raid);
  expect(a.restore).toBe(restore);
});

test.each([
  'coastal-catamarans',
  'filthy-dianoga',
  'desperate-nantex',
  'ryloth-revolutionary-rider',
])('%s has no invented ability', id => {
  const p = position();
  const d = definition(id);
  if (d.kind !== 'unit') throw new Error('Unit expected');
  p.players[0][d.arena] = [{ card: id, ref: 'unit' }];
  const { state, refs } = scenario(p);
  expect(hasUnitAbilities(state, state.cards[refs.unit!]!)).toBe(false);
  expect(unitStats(state, state.cards[refs.unit!]!)).toEqual({ power: d.power, hp: d.hp });
});

test.each([
  ['imperial-commandos', 'defeat', 0],
  ['n-1-patroller', 'defeat', 6],
  ['commandeered-tour-shuttle', 'ready', 0],
  ['starlit-purrgil', 'exhaust', 0],
  ['ben-kenobi--don-t-be-afraid', 'exhaust', 0],
] as const)(
  '%s selects only its legal unit and resolves the printed operation',
  (id, op, damage) => {
    const g = play(id, p => {
      p.players[1].ground = [
        { card: ids.consular, ref: 'enemy', damage, exhausted: op === 'ready' },
      ];
    });
    const after = target(g.s, g.refs.enemy!);
    expect(after.cards[g.refs.enemy!]!.zone).toBe(op === 'defeat' ? 'discard' : 'ground');
    if (op !== 'defeat') expect(after.cards[g.refs.enemy!]!.exhausted).toBe(op === 'exhaust');
    const skip = step(g.s, 'decline-effect');
    expect(skip.cards[g.refs.enemy!]!.zone).toBe('ground');
  },
);

test.each(['dire-prowess', 'occupation-officer'])('%s can give or decline a Weakness', id => {
  const { s, refs } = play(id);
  expect(tokens(target(s, refs.enemy!), refs.enemy!)).toHaveLength(1);
  expect(tokens(step(s, 'decline-effect'), refs.enemy!)).toHaveLength(0);
});

test('Pelta heals the base and a friendly unit; Neebray draws three', () => {
  const g = play('pelta-relief-frigate', p => {
    p.players[0].base.damage = 5;
    p.players[0].ground![0]!.damage = 2;
  });
  const s = target(g.s, g.refs.friendly!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
  expect(s.cards[g.refs.friendly!]!.damage).toBe(0);
  expect(play('neebray-manta').s.players.alice!.hand).toHaveLength(3);
});

test('Invasion Lander buffs other friendly units only for the phase', () => {
  const { s, refs } = play('invasion-lander');
  expect(unitStats(s, s.cards[refs.friendly!]!)).toEqual({ power: 5, hp: 5 });
  expect(unitStats(s, s.cards[refs.source!]!)).toEqual({ power: 3, hp: 7 });
  expect(unitStats(s, s.cards[refs.enemy!]!)).toEqual({ power: 3, hp: 7 });
  expect(s.lastingEffects.some(e => e.expires.kind === 'phase')).toBe(true);
});

test('Zillo Clone reduces other allies, including lethal maintenance, and has optional attack Weakness', () => {
  const p = position();
  p.players[0].hand = [{ card: 'clone-of-the-zillo-beast--emperor-s-experiment', ref: 'source' }];
  p.players[0].resources = resources();
  p.players[0].ground = [
    { card: ids.marine, ref: 'survivor' },
    { card: ids.trooper, ref: 'fragile' },
  ];
  const g = scenario(p);
  const s = step(g.state, 'play');
  expect(s.cards[g.refs.fragile!]!.zone).toBe('discard');
  expect(unitStats(s, s.cards[g.refs.survivor!]!)).toEqual({ power: 1, hp: 1 });
  expect(unitStats(s, s.cards[g.refs.source!]!)).toEqual({ power: 6, hp: 6 });
});

test('Rex buffs vanilla and blanked units but not inactive conditional abilities or granted keywords', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'rex--outserved-his-purpose', ref: 'rex' },
    { card: ids.marine, ref: 'plain' },
    { card: 'opee-sea-killer', ref: 'conditional' },
    { card: 'friendly-eopie', ref: 'keyword' },
  ];
  const { state, refs } = scenario(p);
  expect(unitStats(state, state.cards[refs.plain!]!)).toEqual({ power: 4, hp: 4 });
  expect(unitStats(state, state.cards[refs.conditional!]!)).toEqual({ power: 5, hp: 6 });
  expect(unitStats(state, state.cards[refs.keyword!]!)).toEqual({ power: 0, hp: 4 });
  modifyUnit(state, state.cards[refs.rex!]!, state.cards[refs.conditional!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(unitStats(state, state.cards[refs.conditional!]!)).toEqual({ power: 6, hp: 7 });
  modifyUnit(state, state.cards[refs.rex!]!, state.cards[refs.plain!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    abilities: { keywords: ['Sentinel'] },
    duration: 'phase',
  });
  expect(unitStats(state, state.cards[refs.plain!]!)).toEqual({ power: 3, hp: 3 });
});

test('Zam inherits current friendly leader traits in play and in hidden zones, excluding Force', () => {
  const p = position();
  p.players[0].leader = { card: 'yoda--sensing-darkness' };
  for (const zone of ['hand', 'deck', 'discard', 'resources', 'ground'] as const)
    p.players[0][zone] = [{ card: 'zam-wesell--not-what-she-seems', ref: zone }];
  const { state, refs } = scenario(p);
  for (const zone of ['hand', 'deck', 'discard', 'resources', 'ground']) {
    const c = state.cards[refs[zone]!]!;
    expect(cardTraits(state, c)).toContain('Jedi');
    expect(cardTraits(state, c)).not.toContain('Force');
    expect(
      matchesCard(
        state,
        c,
        { trait: 'Jedi' },
        { source: state.cards[state.players.alice!.leader]! },
      ),
    ).toBe(true);
  }
  modifyUnit(state, state.cards[refs.ground!]!, state.cards[refs.ground!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(cardTraits(state, state.cards[refs.ground!]!)).not.toContain('Jedi');
  expect(cardTraits(state, state.cards[refs.hand!]!)).toContain('Jedi');
});

test('Gree counts icons on upgrades and units, but not undeployed leaders, bases, or enemy cards', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'commander-gree--of-the-41st-elite-corps', ref: 'gree' },
    { card: ids.marine, ref: 'ally' },
  ];
  p.attachments = [{ card: 'local-support', unit: 'ally', ref: 'upgrade' }];
  const { state, refs } = scenario(p);
  expect(effectiveAbilities(state, state.cards[refs.gree!]!).raid).toBe(4);
  state.cards[refs.upgrade!]!.controller = 'bob';
  expect(effectiveAbilities(state, state.cards[refs.gree!]!).raid).toBe(0);
});

test('Volley Fire uses total Raid and attributes damage to the selected unit', () => {
  const g = play('volley-fire', p => {
    p.players[0].ground = [{ card: 'tusken-bantha-rider', ref: 'friendly' }];
  });
  let s = target(g.s, g.refs.friendly!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
  expect(
    numericValue(
      s,
      { source: s.cards[g.refs.friendly!]! },
      { kind: 'unit-keyword-value', target: 'source', keyword: 'Raid' },
    ),
  ).toBe(4);
});

test('Always a Bigger Fish requires actual sacrifice, uses printed cost and limits free creature play', () => {
  const g = play('always-a-bigger-fish', p => {
    p.players[0].ground = [{ card: 'feisty-blurrg', ref: 'friendly' }];
    p.players[0].hand!.push(
      { card: 'opee-sea-killer', ref: 'legal' },
      { card: 'dathomiri-rancor', ref: 'tooBig' },
      { card: ids.consular, ref: 'notCreature' },
    );
  });
  const s = target(g.s, g.refs.friendly!);
  expect(s.cards[g.refs.friendly!]!.zone).toBe('discard');
  const plays = s.execution.decision!.options.map(o => o.intent).filter(i => i.kind === 'play');
  expect(plays.map(i => i.card)).toEqual([g.refs.legal!]);
  resume(s, choose(s, 'play'));
  const after = step(s, 'play');
  expect(after.cards[g.refs.legal!]!.zone).toBe('ground');
  expect(after.players.alice!.resources.filter(id => after.cards[id]!.exhausted)).toHaveLength(4);
});

test('Log Trap permits the second exhausted attack only against units, and resumes mid-sequence', () => {
  const g = play('log-trap');
  let s = target(g.s, g.refs.friendly!);
  s = step(s, i => i.kind === 'attack' && i.defender === s.players.bob!.base);
  expect(s.cards[g.refs.friendly!]!.exhausted).toBe(true);
  expect(
    s.execution
      .decision!.options.filter(o => o.intent.kind === 'attack')
      .map(o => (o.intent as any).defender),
  ).toEqual([g.refs.enemy!]);
  resume(s, choose(s, 'attack'));
  s = step(s, 'attack');
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
});

test('Forced Pacification defeats exact allies together and exhausts twice the actual defeated count', () => {
  const g = play('forced-pacification', p => {
    p.players[0].ground!.push({ card: ids.marine, ref: 'other' });
    p.players[1].ground!.push(
      { card: ids.marine, ref: 'enemy2' },
      { card: ids.marine, ref: 'enemy3' },
    );
  });
  let s = step(g.s, 'accept-effect', [g.refs.friendly!]);
  expect(s.cards[g.refs.friendly!]!.zone).toBe('discard');
  expect(s.execution.decision!.selection).toMatchObject({ min: 2, max: 2 });
  resume(s, choose(s, 'accept-effect', [g.refs.enemy!, g.refs.enemy2!]));
  s = step(s, 'accept-effect', [g.refs.enemy!, g.refs.enemy2!]);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy2!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy3!]!.exhausted).toBe(false);
  expect(step(g.s, 'accept-effect').cards[g.refs.friendly!]!.zone).toBe('ground');
});

test.each([
  ['opee-sea-killer', 'great-grass-plains', 'Grit'],
  ['soaring-can-cell', 'kachirho', 'Ambush'],
] as const)('%s recognizes the printed planetary base trait', (id, base, keyword) => {
  for (const enabled of [false, true]) {
    const p = position();
    p.players[0].ground = [{ card: id, ref: 'unit' }];
    if (enabled) p.players[0].base = { card: base };
    const g = scenario(p);
    expect(
      effectiveAbilities(g.state, g.state.cards[g.refs.unit!]!).keywords!.includes(keyword),
    ).toBe(enabled);
  }
});

test('unit-count, readiness and resource conditions use current state', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'child-of-dathomir', ref: 'child' },
    { card: 'pack-guardian', ref: 'pack' },
  ];
  p.players[0].space = [
    { card: 'v-19-skirmisher', ref: 'v19' },
    { card: 'jedi-interceptor', ref: 'jedi' },
  ];
  p.players[0].resources = resources(6);
  const g = scenario(p),
    s = g.state;
  expect(unitStats(s, s.cards[g.refs.child!]!).power).toBe(3);
  expect(effectiveAbilities(s, s.cards[g.refs.pack!]!).keywords).toContain('Sentinel');
  expect(effectiveAbilities(s, s.cards[g.refs.v19!]!).keywords).toContain('Sentinel');
  expect(unitStats(s, s.cards[g.refs.jedi!]!).power).toBe(4);
  s.cards[g.refs.pack!]!.exhausted = true;
  expect(effectiveAbilities(s, s.cards[g.refs.pack!]!).keywords).not.toContain('Sentinel');
  const after = effects(s, g.refs.child!, [{ kind: 'defeat-units', filter: { arena: 'space' } }]);
  expect(unitStats(after, after.cards[g.refs.child!]!).power).toBe(1);
});

test.each([0, 1, 2, 5, 6])('Wroshyr and Migrate floor-divide %s actual resources', count => {
  const p = position();
  p.players[0].resources = resources(count);
  p.players[0].ground = [{ card: 'wroshyr-rebel', ref: 'rebel' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.rebel!]!).power).toBe(Math.floor(count / 2));
  const d = definition('migrate');
  if (d.kind !== 'event') throw new Error('event');
  const after = effects(g.state, g.refs.rebel!, d.effects);
  expect(beasts(after)).toHaveLength(Math.floor(count / 3));
});

test('Aggrocrab and Rebel Operation apply printed cost reductions', () => {
  const g = play('aggrocrab');
  expect(g.s.cards[g.refs.source!]!.resourcesPaid).toBe(4);
  const rebel = play('rebel-operation');
  // Sabine and Battlefield Marine are distinct friendly Rebel cards.
  expect(rebel.s.players.alice!.hand).toHaveLength(2);
  expect(rebel.s.players.alice!.resources.filter(id => rebel.s.cards[id]!.exhausted)).toHaveLength(
    2,
  );
});

test.each([
  ['devotion', 'restore', 2],
  ['enraged', 'raid', 2],
] as const)('%s grants its host the printed keyword', (id, key, value) => {
  const g = play(id);
  expect(effectiveAbilities(g.s, g.s.cards[g.refs.friendly!]!)[key]).toBe(value);
  const blank = effects(g.s, g.refs.source!, [
    {
      kind: 'modify-units',
      filter: { controller: 'friendly' },
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
  ]);
  expect(effectiveAbilities(blank, blank.cards[g.refs.friendly!]!)[key]).toBe(0);
});

test("Hunter's Instinct grants Grit only to a Creature, and Gaderffii checks power before attaching", () => {
  const a = play('hunter-s-instinct');
  expect(effectiveAbilities(a.s, a.s.cards[a.refs.friendly!]!).keywords).not.toContain('Grit');
  const b = play('hunter-s-instinct', p => {
    p.players[0].ground = [{ card: 'territorial-mudhorn', ref: 'friendly' }];
  });
  expect(effectiveAbilities(b.s, b.s.cards[b.refs.friendly!]!).keywords).toContain('Grit');
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: 'gaderffii-stick', ref: 'stick' }];
  p.players[0].ground = [
    { card: ids.marine, ref: 'legal' },
    { card: 'filthy-dianoga', ref: 'big' },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const g = scenario(p);
  const targets = g.state.execution
    .decision!.options.map(o => o.intent)
    .filter(i => i.kind === 'play')
    .map(i => i.target);
  expect(targets).toEqual([g.refs.legal!]);
});

test('Landing Pad grants its base a friendly space-only power aura', () => {
  const g = play('landing-pad', p => {
    p.players[0].space = [{ card: ids.fighter, ref: 'fighter' }];
  });
  expect(unitStats(g.s, g.s.cards[g.refs.fighter!]!).power).toBe(3);
  expect(unitStats(g.s, g.s.cards[g.refs.friendly!]!).power).toBe(3);
});

test.each([
  ['booma-ball', 'hand'],
  ['frenzied-tri-fighters', 'discard'],
] as const)('%s removes only upgrades costing at most three', (id, zone) => {
  const g = play(id, p => {
    p.attachments = [
      { card: 'academy-training', unit: 'enemy', ref: 'upgrade' },
      { card: 'heavy-blaster-cannon', unit: 'friendly', ref: 'expensive' },
    ];
  });
  expect(g.s.execution.decision!.selection!.cards).toContain(g.refs.upgrade!);
  expect(g.s.execution.decision!.selection!.cards).not.toContain(g.refs.expensive!);
  const s = step(g.s, 'accept-effect', [g.refs.upgrade!]);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe(zone);
});

test('Wild Space Wanderer restricts removal to bases, and Renew to Condition upgrades', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  p.players[0].base.ref = 'base';
  p.attachments = [
    { card: 'landing-pad', unit: 'base', ref: 'fortify' },
    { card: 'nowhere-to-hide', unit: 'unit', ref: 'condition' },
  ];
  const g = scenario(p),
    context = { source: g.state.cards[g.refs.unit!]! };
  expect(
    matchingUpgrades(g.state, 'alice', { hostKind: 'base' }, context).map(c => c.instanceId),
  ).toEqual([g.refs.fortify!]);
  expect(
    matchingUpgrades(g.state, 'alice', { trait: 'Condition' }, context).map(c => c.instanceId),
  ).toEqual([g.refs.condition!]);
  const s = play('wild-space-wanderer', input => {
    input.players[0].base.ref = 'base';
    input.attachments = [{ card: 'landing-pad', unit: 'base', ref: 'fortify' }];
  });
  expect(step(s.s, 'accept-effect', [s.refs.fortify!]).cards[s.refs.fortify!]!.zone).toBe(
    'discard',
  );
  const r = play('renew', input => {
    input.players[0].base.damage = 5;
    input.attachments = [{ card: 'nowhere-to-hide', unit: 'enemy', ref: 'condition' }];
  });
  const after = step(r.s, 'accept-effect', [r.refs.condition!]);
  expect(after.cards[r.refs.condition!]!.zone).toBe('discard');
  expect(after.cards[after.players.alice!.base]!.damage).toBe(2);
});

test('Heroic Bravery and Villainous Ambition check the host aspect, not the upgrade controller', () => {
  const heroic = play('heroic-bravery');
  expect(tokens(heroic.s, heroic.refs.friendly!, 'shield')).toHaveLength(1);
  const wrong = play('heroic-bravery', p => {
    p.players[0].ground = [{ card: 'filthy-dianoga', ref: 'friendly' }];
  });
  expect(tokens(wrong.s, wrong.refs.friendly!, 'shield')).toHaveLength(0);
  const villain = play('villainous-ambition', p => {
    p.players[0].ground = [{ card: ids.trooper, ref: 'friendly' }];
  });
  expect(target(villain.s, villain.refs.enemy!).cards[villain.refs.enemy!]!.damage).toBe(2);
});

test('Geonosian Picador creates before choosing Weakness; Catch the Scent readies one exact new Beast', () => {
  const g = play('geonosian-picador');
  expect(beasts(g.s)).toHaveLength(1);
  const s = target(g.s, beasts(g.s)[0]!.instanceId);
  expect(tokens(s, beasts(s)[0]!.instanceId)).toHaveLength(1);
  const c = play('catch-the-scent', p => {
    p.players[0].ground = [{ card: 'beast', ref: 'old', exhausted: true }];
  });
  const fresh = beasts(c.s).filter(b => b.instanceId !== c.refs.old);
  expect(fresh).toHaveLength(2);
  expect(
    c.s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === c.refs.old,
    ),
  ).toBe(false);
  const ready = target(c.s, fresh[1]!.instanceId);
  expect(
    beasts(ready)
      .filter(b => !b.exhausted)
      .map(b => b.instanceId),
  ).toEqual([fresh[1]!.instanceId]);
});

test('Run Amok selects both targets before simultaneous damage and still works without enemies', () => {
  const g = play('run-amok');
  const first = target(g.s, g.refs.friendly!);
  expect(first.cards[g.refs.friendly!]!.damage).toBe(0);
  const s = target(first, g.refs.enemy!);
  expect(s.cards[g.refs.friendly!]!.damage).toBe(1);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
  const alone = play('run-amok', p => {
    p.players[1].ground = [];
  });
  expect(target(alone.s, alone.refs.friendly!).cards[alone.refs.friendly!]!.damage).toBe(1);
});

test('Mylaya and Imperial Cavalry create a Beast before healing or enemy damage', () => {
  const m = play('mylaya-rider', p => {
    p.players[0].base.damage = 4;
  });
  expect(beasts(m.s)).toHaveLength(1);
  expect(m.s.cards[m.s.players.alice!.base]!.damage).toBe(2);
  const i = play('imperial-cavalry');
  const s = target(i.s, i.refs.enemy!);
  expect(beasts(s)).toHaveLength(1);
  expect(s.cards[i.refs.enemy!]!.damage).toBe(1);
});

test('Poacher can decline self-defeat, or sacrifice and damage the newly created Beast', () => {
  const g = play('poacher-s-starfighter');
  const skip = step(g.s, 'decline-effect');
  expect(skip.cards[g.refs.source!]!.zone).toBe('space');
  let s = step(g.s, 'accept-effect');
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  expect(beasts(s)).toHaveLength(1);
  expect(beasts(s)[0]!.damage).toBe(1);
});

test('Progenitor counts the added Weakness using last known attachments if it becomes lethal', () => {
  for (const lethal of [false, true]) {
    const p = position();
    p.players[0].ground = [
      { card: 'the-great-progenitor--first-of-the-drengir', ref: 'source', damage: lethal ? 4 : 0 },
    ];
    p.attachments = [
      { card: 'weakness', unit: 'source' },
      { card: 'weakness', unit: 'source' },
    ];
    const g = scenario(p);
    let s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.source &&
        i.defender === g.state.players.bob!.base,
    );
    resume(s, choose(s, 'target'));
    s = target(s, g.refs.source!);
    expect(beasts(s)).toHaveLength(3);
    expect(s.cards[g.refs.source!]!.zone).toBe(lethal ? 'discard' : 'ground');
  }
});

test('Trust Yourself grants Shield and retains a private recoverable search', () => {
  const g = play('trust-yourself');
  const s = target(g.s, g.refs.friendly!);
  expect(tokens(s, g.refs.friendly!, 'shield')).toHaveLength(1);
  expect(s.execution.decision!.playerId).toBe('alice');
  resume(s, choose(s, 'search', [s.execution.decision!.selection!.cards[0]!]));
});

test('Resonate requires a non-leader sharing a friendly leader trait', () => {
  const match = play('resonate', p => {
    p.players[0].base.damage = 6;
  });
  expect(
    target(match.s, match.s.players.alice!.base).cards[match.s.players.alice!.base]!.damage,
  ).toBe(2);
  const miss = play('resonate', p => {
    p.players[0].ground = [{ card: 'filthy-dianoga', ref: 'friendly' }];
    p.players[0].base.damage = 6;
  });
  expect(miss.s.execution.decision!.kind).toBe('action');
  expect(miss.s.cards[miss.s.players.alice!.base]!.damage).toBe(6);
});

test('Local Support reveals and draws only a top card sharing a friendly unit trait', () => {
  for (const match of [false, true]) {
    const g = play('local-support', p => {
      p.players[0].deck = [{ card: match ? ids.marine : 'filthy-dianoga', ref: 'top' }];
    });
    expect(g.s.cards[g.refs.top!]!.zone).toBe(match ? 'hand' : 'deck');
  }
});

test('Emerie discounts the next unit after friendly damage, including lethal damage and prevention', () => {
  for (const shield of [false, true]) {
    const g = play('emerie-karr--for-your-own-good', p => {
      p.players[0].ground = [{ card: ids.marine, ref: 'friendly', damage: 2 }];
      if (shield) p.attachments = [{ card: 'shield', unit: 'friendly' }];
    });
    const s = target(g.s, g.refs.friendly!);
    expect(s.cards[g.refs.friendly!]!.zone).toBe(shield ? 'ground' : 'discard');
    expect(s.playModifiers).toHaveLength(1);
    expect(step(g.s, 'decline-effect').playModifiers).toHaveLength(0);
    expect(target(g.s, g.refs.enemy!).playModifiers).toHaveLength(0);
  }
});

test('Mining Guild Trespasser can deal both hits together or only the base hit without enemies', () => {
  for (const enemy of [false, true]) {
    const g = play('mining-guild-trespasser', p => {
      if (!enemy) p.players[1].ground = [];
    });
    let s = step(g.s, 'accept-effect');
    s = target(s, s.players.bob!.base);
    if (enemy) {
      expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
      s = target(s, g.refs.enemy!);
    }
    expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
    if (enemy) expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  }
});

test('New Tactics gives the owner, not current controller, the top/bottom choice', () => {
  const g = play('new-tactics', p => {
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy', controller: 'alice' }];
  });
  let s = target(g.s, g.refs.enemy!);
  expect(s.execution.decision!.playerId).toBe('bob');
  resume(
    s,
    choose(s, i => i.kind === 'choose-mode' && i.mode === 'deck-bottom'),
  );
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'deck-bottom');
  expect(s.players.bob!.deck.at(-1)).toBe(g.refs.enemy);
});

test('Mon Cal Cruiser inspection is private and optional discard draws a replacement only when used', () => {
  const g = play('mon-cal-cruiser', p => {
    p.players[1].hand = [{ card: ids.marine, ref: 'hand' }];
  });
  const s = step(g.s, i => i.kind === 'choose-mode' && i.mode === 'inspect-hand');
  expect(s.execution.decision!.playerId).toBe('alice');
  resume(s, choose(s, 'accept-effect', [g.refs.hand!]));
  const after = step(s, 'accept-effect', [g.refs.hand!]);
  expect(after.cards[g.refs.hand!]!.zone).toBe('discard');
  expect(after.players.bob!.hand).toHaveLength(1);
  expect(step(s, 'accept-effect').cards[g.refs.hand!]!.zone).toBe('hand');
});

test('Harbinger gives the enemy the target choice but retains its own damage/skip choice', () => {
  const g = play('separatist-harbinger');
  expect(g.s.execution.decision!.playerId).toBe('bob');
  const s = target(g.s, g.refs.enemy!);
  expect(s.execution.decision!.playerId).toBe('alice');
  resume(
    s,
    choose(s, i => i.kind === 'choose-mode' && i.mode === 'deal-damage'),
  );
  expect(
    step(s, i => i.kind === 'choose-mode' && i.mode === 'deal-damage').cards[g.refs.enemy!]!.damage,
  ).toBe(2);
  expect(
    step(s, i => i.kind === 'choose-mode' && i.mode === 'skip').cards[g.refs.enemy!]!.damage,
  ).toBe(0);
});

test('Familiar Strategem checks another friendly unit, never the attacker alone', () => {
  for (const sharing of [false, true]) {
    const g = play('familiar-strategem', p => {
      if (sharing) p.players[0].ground!.push({ card: ids.marine, ref: 'other' });
    });
    let s = target(g.s, g.refs.friendly!);
    s = step(s, i => i.kind === 'attack' && i.defender === s.players.bob!.base);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(sharing ? 5 : 3);
  }
});

test('Howl creates its Beast even when the optional return is declined', () => {
  const g = play('howl');
  expect(beasts(step(g.s, 'decline-effect'))).toHaveLength(1);
  const s = target(g.s, g.refs.enemy!);
  expect(beasts(s)).toHaveLength(1);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('hand');
});

test('Saw observes only enemy event plays and resources the deck top exhausted', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: 'saw-gerrera--shadowlands-insurgent', ref: 'saw' }];
  p.players[0].deck = [{ card: ids.marine, ref: 'top' }];
  p.players[1].hand = [{ card: 'resupply', ref: 'event' }];
  p.players[1].resources = resources();
  const g = scenario(p);
  const s = step(g.state, i => i.kind === 'play' && i.card === g.refs.event);
  expect(s.cards[g.refs.top!]!.zone).toBe('resources');
  expect(s.cards[g.refs.top!]!.exhausted).toBe(true);
});

test('Gungi survives damage before choosing a recoverable discard choice, and never readies after lethal damage', () => {
  for (const lethal of [false, true]) {
    const p = position();
    p.activePlayer = 'bob';
    p.players[0].ground = [
      {
        card: 'gungi--fighting-for-kashyyyk',
        ref: 'gungi',
        exhausted: true,
        damage: lethal ? 4 : 0,
      },
    ];
    p.players[0].hand = [{ card: ids.marine, ref: 'discard' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'source' }];
    const g = scenario(p);
    // Real damage passes through the same survivor observer used by combat.
    let s = effects(g.state, g.refs.gungi!, [
      { kind: 'on-unit', target: 'source', operation: { kind: 'damage', amount: 1 } },
    ]);
    if (lethal) {
      expect(s.cards[g.refs.gungi!]!.zone).toBe('discard');
      expect(s.players.alice!.hand).toHaveLength(1);
      continue;
    }
    expect(s.execution.decision!.playerId).toBe('alice');
    resume(s, choose(s, 'accept-effect', [g.refs.discard!]));
    s = step(s, 'accept-effect', [g.refs.discard!]);
    expect(s.cards[g.refs.discard!]!.zone).toBe('discard');
    expect(s.cards[g.refs.gungi!]!.exhausted).toBe(false);
  }
});

test('Insurgent Camp can sacrifice itself to ready the exact qualifying played unit', () => {
  const g = play('insurgent-camp', p => {
    p.players[0].hand!.push({ card: ids.marine, ref: 'unit' });
  });
  let s = step(g.s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.unit);
  resume(s, choose(s, 'accept-effect'));
  const yes = step(s, 'accept-effect');
  expect(yes.cards[g.refs.source!]!.zone).toBe('discard');
  expect(yes.cards[g.refs.unit!]!.exhausted).toBe(false);
  const no = step(s, 'decline-effect');
  expect(no.cards[g.refs.source!]!.zone).toBe('base');
  expect(no.cards[g.refs.unit!]!.exhausted).toBe(true);
});

test('Defoliator Tank excludes Droid and Vehicle defenders and pays before giving two Weaknesses', () => {
  for (const defender of [ids.consular, 'battle-droid', 'hijacked-at-st']) {
    const p = position();
    p.players[0].resources = resources(2);
    p.players[0].ground = [{ card: 'defoliator-tank', ref: 'tank' }];
    p.players[1].ground = [{ card: defender, ref: 'defender' }];
    const g = scenario(p);
    let s = step(
      g.state,
      i => i.kind === 'attack' && i.attacker === g.refs.tank && i.defender === g.refs.defender,
    );
    if (defender !== ids.consular) {
      expect(s.execution.decision!.kind).toBe('action');
      expect(tokens(s, g.refs.defender!)).toHaveLength(0);
      continue;
    }
    resume(s, choose(s, 'accept-effect'));
    s = step(s, 'accept-effect');
    expect(tokens(s, g.refs.defender!)).toHaveLength(2);
    expect(s.players.alice!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
  }
});

test('Howler Pack creates a Beast when played and again when defeated; Wyyyshokk targets damaged units only', () => {
  const g = play('howler-pack');
  expect(beasts(g.s)).toHaveLength(1);
  const s = effects(g.s, g.refs.source!, [
    { kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } },
  ]);
  expect(beasts(s)).toHaveLength(2);
  const p = position();
  p.players[0].ground = [
    { card: 'venomous-wyyyshokk', ref: 'spider' },
    { card: ids.consular, ref: 'damaged', damage: 1 },
    { card: ids.marine, ref: 'undamaged' },
  ];
  const setup = scenario(p);
  const choice = effects(setup.state, setup.refs.spider!, [
    { kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } },
  ]);
  expect(
    choice.execution
      .decision!.options.filter(o => o.intent.kind === 'target')
      .map(o => (o.intent as any).card),
  ).toEqual([setup.refs.damaged!]);
  expect(tokens(target(choice, setup.refs.damaged!), setup.refs.damaged!)).toHaveLength(1);
});

test('Corona X-wing optionally readies one resource on attack; Lakeside Shaaks readies one when played', () => {
  const p = position();
  p.players[0].resources = [{ card: ids.marine, ref: 'resource', exhausted: true }];
  p.players[0].space = [{ card: 'corona-squadron-x-wing', ref: 'fighter' }];
  const g = scenario(p);
  let s = step(
    g.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === g.refs.fighter &&
      i.defender === g.state.players.bob!.base,
  );
  s = step(s, 'accept-effect', [g.refs.resource!]);
  expect(s.cards[g.refs.resource!]!.exhausted).toBe(false);
  const l = play('lakeside-shaaks');
  const paid = l.s.players.alice!.resources.filter(id => l.s.cards[id]!.exhausted);
  const after = step(l.s, 'accept-effect', [paid[0]!]);
  expect(after.players.alice!.resources.filter(id => after.cards[id]!.exhausted)).toHaveLength(
    paid.length - 1,
  );
});

test('Garnac cannot select himself for his follow-up attack even if readied; Patrol checks another costly ally', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'garnac--let-the-hunt-begin-', ref: 'garnac' },
    { card: 'stormtrooper-patrol', ref: 'patrol' },
    { card: ids.consular, ref: 'other' },
  ];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.patrol!]!).power).toBe(4);
  let s = step(
    g.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === g.refs.garnac &&
      i.defender === g.state.players.bob!.base,
  );
  s.cards[g.refs.garnac!]!.exhausted = false;
  const d = definition('garnac--let-the-hunt-begin-');
  if (d.kind !== 'unit') throw new Error('Unit');
  s = effects(s, g.refs.garnac!, d.triggers![0]!.effects);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.attacker === g.refs.garnac,
    ),
  ).toBe(false);
});

test('Mon Cal Cruiser inspection does not leak the enemy hand to unauthorized spectators', () => {
  const views = ['filthy-dianoga', 'coastal-catamarans'].map(card => {
    const g = play('mon-cal-cruiser', p => {
      p.players[1].hand = [{ card, ref: 'hidden' }];
    });
    const s = step(g.s, i => i.kind === 'choose-mode' && i.mode === 'inspect-hand');
    return new Projector(
      s.gameId,
      { role: 'spectator', showRevealedHands: false },
      'q'.repeat(32),
    ).project(s);
  });
  expect(views[0]).toEqual(views[1]);
});

test('Awakened Exogorth reduces only its defender during its attack, and Ben heals another unit on attack', () => {
  const p = position();
  p.players[0].space = [{ card: 'awakened-exogorth', ref: 'exogorth' }];
  p.players[1].space = [{ card: 'neebray-manta', ref: 'defender' }];
  const g = scenario(p);
  const s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.exogorth && i.defender === g.refs.defender,
  );
  expect(s.cards[g.refs.exogorth!]!.damage).toBe(4);
  const q = position();
  q.players[0].ground = [
    { card: 'ben-kenobi--don-t-be-afraid', ref: 'ben' },
    { card: ids.consular, ref: 'patient', damage: 4 },
  ];
  const b = scenario(q);
  const heal = step(
    b.state,
    i =>
      i.kind === 'attack' && i.attacker === b.refs.ben && i.defender === b.state.players.bob!.base,
  );
  expect(target(heal, b.refs.patient!).cards[b.refs.patient!]!.damage).toBe(1);
});

test('recordings made by runtime 1.1.0 retain old IDs, hashes and facts in a cold 1.2 process', () => {
  registerCatalog(validateCatalog(previewIdRecording.catalog));
  for (const recorded of previewIdRecording.cases) {
    const result = advance(decodeState(recorded.checkpoint), recorded.input);
    expect(stateDigest(encodeState(result.state))).toBe(recorded.stateHash);
    expect<unknown>(result.facts).toEqual(recorded.facts);
    expect(result.state.versions.engine).toBe('1.1.0');
    const child = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        [
          "import { registerCatalog } from './play/cards/catalog.ts';",
          "import { validateCatalog } from './play/cards/validate.ts';",
          "import { decodeState } from './play/engine/checkpoint.ts';",
          "import { advance } from './play/engine/advance.ts';",
          'const {catalog, recorded} = await Bun.stdin.json();',
          'registerCatalog(validateCatalog(catalog));',
          'console.log(JSON.stringify(advance(decodeState(recorded.checkpoint), recorded.input)));',
        ].join('\n'),
      ],
      {
        cwd: new URL('../../', import.meta.url).pathname,
        stdin: new TextEncoder().encode(
          JSON.stringify({ catalog: previewIdRecording.catalog, recorded }),
        ),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    expect(child.stderr.toString()).toBe('');
    expect(child.exitCode).toBe(0);
    expect(JSON.parse(child.stdout.toString())).toEqual(result);
  }
});

test('Homeworlds additions cannot claim the older 1.1 card-data contract', () => {
  const data = structuredClone(bundledCatalog.data);
  data.version = '1.1.996';
  data.requiredEngine = '1.1.0';
  expect(() => validateCatalog(data)).toThrow('Invalid card definition');
});
