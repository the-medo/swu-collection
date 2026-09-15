import { expect, test } from 'bun:test';
import { modifyUnit } from '../engine/lasting.ts';
import { cardDefinition } from '../cards/registry.ts';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { credits, readyResourceCount } from '../engine/credits.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
const tokens = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && ['ground', 'space'].includes(c.zone));
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  return p;
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function trigger(s: GameState, abilityId: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === abilityId)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function regroup(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === option.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

function triggers(s: GameState) {
  for (let n = 0; n < 15 && s.execution.decision?.kind === 'trigger'; n++) s = step(s, 'trigger');
  return s;
}

function randomize(s: GameState) {
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: s.execution.random!.id,
    values: s.execution.random!.bounds.map(() => 0),
  }).state;
}
function targets(s: GameState) {
  return s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
}

function pilot(s: GameState, card: string, host: string) {
  return step(
    s,
    i => i.kind === 'play' && i.card === card && i.target === host && i.piloting === 'piloting',
  );
}
function blank(s: GameState, id: string) {
  modifyUnit(s, s.cards[s.players.alice!.leader]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
}

test('Lando reduces only the unit attacking him and keeps Sentinel while defending', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'lando-calrissian--eyes-open', ref: 'lando' }];
  const g = scenario(p),
    after = attack(g.state, g.refs.attacker!, g.refs.lando!);
  expect(after.cards[g.refs.lando!]!.damage).toBe(2);
  expect(after.cards[g.refs.attacker!]!.zone).toBe('discard');
  expect(effectiveAbilities(after, after.cards[g.refs.lando!]!).keywords).toContain('Sentinel');
});

test('Biggs grants Fighter Overwhelm, Speeder Grit and a Transport HP bonus on the correct host', () => {
  for (const [host, keyword, bonus] of [
    [ids.fighter, 'Overwhelm', 0],
    ['skyhopper-canyon-runner', 'Grit', 0],
    ['razor-crest--ride-for-hire', '', 1],
  ] as const) {
    const p = position();
    const d = cardDefinition(host);
    if (d.kind !== 'unit') throw new Error('Expected unit');
    p.players[0][d.arena] = [{ card: host, ref: 'host' }];
    p.attachments = [
      { card: 'biggs-darklighter--they-ll-never-stop-us', unit: 'host', ref: 'biggs' },
    ];
    const g = scenario(p);
    expect(unitStats(g.state, g.state.cards[g.refs.host!]!).hp).toBe(d.hp + 1 + bonus);
    if (keyword)
      expect(effectiveAbilities(g.state, g.state.cards[g.refs.host!]!).keywords).toContain(keyword);
    blank(g.state, g.refs.host!);
    expect(unitStats(g.state, g.state.cards[g.refs.host!]!).hp).toBe(d.hp + 1 + bonus);
    if (keyword)
      expect(effectiveAbilities(g.state, g.state.cards[g.refs.host!]!).keywords).not.toContain(
        keyword,
      );
  }
});

test('Mandalorian unit chooses up to two exact ground units before exhausting them; Pilot targets one enemy in its host arena', () => {
  const p = playFixture('the-mandalorian--weathered-pilot');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'play' && !i.piloting);
  expect(pending.execution.decision!.selection!.max).toBe(2);
  expect(pending.execution.decision!.selection!.cards).not.toContain(g.refs.space!);
  expect(() => step(pending, 'accept-effect', [g.refs.ground!, g.refs.ground!])).toThrow();
  resume(pending, choose(pending, 'accept-effect', [g.refs.friendly!, g.refs.ground!]));
  const after = step(pending, 'accept-effect', [g.refs.friendly!, g.refs.ground!]);
  expect(after.cards[g.refs.friendly!]!.exhausted).toBe(true);
  expect(after.cards[g.refs.ground!]!.exhausted).toBe(true);
  const attached = pilot(g.state, g.refs.played!, g.refs.host!);
  expect(targets(attached)).toEqual([g.refs.space!]);
  expect(target(attached, g.refs.space!).cards[g.refs.space!]!.exhausted).toBe(true);
});

test('Nien counts other friendly Pilot units and upgrades, excludes hidden Pilots and himself, and changes with control', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'nien-nunb--loyal-co-pilot', ref: 'nien' },
    { card: 'clone-pilot', ref: 'pilot-unit' },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].hand = [{ card: 'clone-pilot' }];
  p.players[1].ground = [{ card: 'clone-pilot', ref: 'enemy' }];
  p.attachments = [{ card: 'biggs-darklighter--they-ll-never-stop-us', unit: 'host' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.nien!]!).power).toBe(3);
  g.state.cards[g.refs.enemy!]!.controller = 'alice';
  expect(unitStats(g.state, g.state.cards[g.refs.nien!]!).power).toBe(4);
  blank(g.state, g.refs.nien!);
  expect(unitStats(g.state, g.state.cards[g.refs.nien!]!).power).toBe(1);
});

test('Nien upgrade excludes its own Pilot card and its imposed power survives host ability loss', () => {
  const p = position();
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].ground = [{ card: 'clone-pilot' }];
  p.attachments = [{ card: 'nien-nunb--loyal-co-pilot', unit: 'host', ref: 'nien' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.host!]!).power).toBe(4);
  blank(g.state, g.refs.host!);
  expect(unitStats(g.state, g.state.cards[g.refs.host!]!).power).toBe(4);
});

test('Raddus Sentinel counts a friendly Resistance leader or upgrade, but not itself or hidden cards', () => {
  const p = position();
  p.players[0].space = [{ card: 'raddus--holdo-s-final-command', ref: 'raddus' }];
  p.players[0].hand = [{ card: 'resistance-blue-squadron' }];
  const alone = scenario(p);
  expect(
    effectiveAbilities(alone.state, alone.state.cards[alone.refs.raddus!]!).keywords,
  ).not.toContain('Sentinel');
  p.players[0].leader.card = 'rose-tico--saving-what-we-love';
  const leader = scenario(p);
  expect(
    effectiveAbilities(leader.state, leader.state.cards[leader.refs.raddus!]!).keywords,
  ).toContain('Sentinel');
  p.players[0].leader.card = ids.leader;
  p.attachments = [{ card: 'paige-tico--dropping-the-hammer', unit: 'raddus' }];
  const upgraded = scenario(p);
  expect(
    effectiveAbilities(upgraded.state, upgraded.state.cards[upgraded.refs.raddus!]!).keywords,
  ).toContain('Sentinel');
});

test('Raddus defeated ability uses its last-known upgraded power against an enemy unit', () => {
  const p = playFixture('get-lost');
  p.players[0].space = [{ card: 'raddus--holdo-s-final-command', ref: 'raddus' }];
  p.players[1].space = [{ card: 'the-purrgil-king--leading-the-journey', ref: 'enemy' }];
  p.attachments = [{ card: 'experience', unit: 'raddus' }];
  const g = scenario(p),
    pending = target(step(g.state, 'play'), g.refs.raddus!);
  expect(targets(pending)).toEqual([g.refs.enemy!]);
  expect(target(pending, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(9);
});

test('C-3PO may grant Experience to either player non-leader sharing a friendly leader trait, excluding itself', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'c-3po--translation-protocol', ref: 'threepio' },
    { card: ids.marine, ref: 'rebel' },
    { card: 'clone-pilot', ref: 'clone' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy-rebel' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.threepio!, g.state.players.bob!.base);
  expect(targets(pending)).toEqual([g.refs.rebel!, g.refs['enemy-rebel']!]);
  expect(upgrades(target(pending, g.refs['enemy-rebel']!), g.refs['enemy-rebel']!)).toEqual([
    'experience',
  ]);
});

test('Nihilus chooses only the tied least remaining HP among other units and gives Experience for a defeated non-Vehicle', () => {
  const p = playFixture('darth-nihilus--lord-of-hunger');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly', damage: 1 }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy', damage: 5 },
    { card: ids.marine, ref: 'healthy' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(targets(pending)).toEqual([g.refs.friendly!, g.refs.enemy!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const after = target(pending, g.refs.enemy!);
  expect(after.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(upgrades(after, g.refs.played!)).toEqual(['experience']);
  const v = position();
  v.players[0].ground = [{ card: 'darth-nihilus--lord-of-hunger', ref: 'nihilus' }];
  v.players[1].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const vehicle = scenario(v),
    kill = target(
      attack(vehicle.state, vehicle.refs.nihilus!, vehicle.state.players.bob!.base),
      vehicle.refs.vehicle!,
    );
  expect(kill.cards[vehicle.refs.vehicle!]!.zone).toBe('discard');
  expect(upgrades(kill, vehicle.refs.nihilus!)).toEqual([]);
});

test('Crix discounts a Heroism unit by two per strictly controlled arena, counting itself and excluding Pilot plays', () => {
  for (const arenas of [0, 1, 2]) {
    const p = playFixture('crix-madine--strike-team-strategist');
    p.players[0].hand!.push(
      { card: 'consular-security-force', ref: 'nested' },
      { card: 'biggs-darklighter--they-ll-never-stop-us', ref: 'pilot' },
    );
    p.players[1].ground = arenas === 0 ? [{ card: ids.marine }] : [];
    p.players[0].space = arenas === 2 ? [{ card: ids.fighter }] : [];
    const g = scenario(p),
      pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
    expect(
      pending.execution.decision!.options.some(
        o => o.intent.kind === 'play' && !!o.intent.piloting,
      ),
    ).toBe(false);
    const before = readyResourceCount(pending, 'alice');
    const after = step(pending, i => i.kind === 'play' && i.card === g.refs.nested);
    expect(before - readyResourceCount(after, 'alice')).toBe(Math.max(0, 6 - 2 * arenas));
    expect(after.cards[g.refs.nested!]!.zone).toBe('ground');
  }
});

test('Warrior of Clan Ordo reveals a legal Aggression card or damages its own base, with recoverable decline', () => {
  const p = position();
  p.players[0].ground = [{ card: 'warrior-of-clan-ordo', ref: 'warrior' }];
  p.players[0].hand = [
    { card: ids.trooper, ref: 'red' },
    { card: ids.marine, ref: 'green' },
  ];
  const g = scenario(p),
    pending = attack(g.state, g.refs.warrior!, g.state.players.bob!.base);
  expect(() => step(pending, 'accept-effect', [g.refs.green!])).toThrow();
  resume(pending, choose(pending, 'decline-effect'));
  expect(step(pending, 'decline-effect').cards[g.state.players.alice!.base]!.damage).toBe(2);
  const disclosed = step(pending, 'accept-effect', [g.refs.red!]);
  expect(disclosed.cards[g.state.players.alice!.base]!.damage).toBe(0);
  expect(disclosed.cards[g.refs.red!]!.zone).toBe('hand');
});

test('Razor Crest responds to a Pilot attaching, not ordinary upgrades or tokens, with the exact cost/exhaustion restrictions', () => {
  const p = playFixture('clone-pilot');
  p.players[0].space = [{ card: 'razor-crest--ride-for-hire', ref: 'host' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'cheap' },
    { card: ids.consular, ref: 'expensive' },
    { card: ids.consular, ref: 'exhausted', exhausted: true },
  ];
  const g = scenario(p),
    pending = pilot(g.state, g.refs.played!, g.refs.host!);
  expect(targets(pending)).toEqual([g.refs.cheap!, g.refs.exhausted!]);
  expect(target(pending, g.refs.exhausted!).cards[g.refs.exhausted!]!.zone).toBe('hand');
  p.players[0].hand = [{ card: 'academy-training', ref: 'ordinary' }];
  const ordinary = scenario(p),
    noTrigger = step(
      ordinary.state,
      i =>
        i.kind === 'play' && i.card === ordinary.refs.ordinary && i.target === ordinary.refs.host,
    );
  expect(noTrigger.execution.decision!.kind).toBe('action');
});

test('Vader Twilight shields one friendly and one enemy unit, then can defeat an enemy Shielded leader during its attack', () => {
  const p = playFixture('darth-vader--twilight-of-the-apprentice');
  p.players[1].leader.deployedAs = 'unit';
  const g = scenario(p);
  const after = target(target(step(g.state, 'play'), g.refs.played!), g.state.players.bob!.leader);
  expect(upgrades(after, g.refs.played!)).toEqual(['shield']);
  expect(upgrades(after, g.state.players.bob!.leader)).toEqual(['shield']);
  const a = position();
  a.players[0].ground = [{ card: 'darth-vader--twilight-of-the-apprentice', ref: 'vader' }];
  a.players[1].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
  a.attachments = [{ card: 'shield', unit: 'leader' }];
  const d = scenario(a),
    defeated = target(attack(d.state, d.refs.vader!, d.state.players.bob!.base), d.refs.leader!);
  expect(defeated.cards[d.refs.leader!]!.zone).toBe('base');
  expect(defeated.cards[d.refs.leader!]!.deployedAs).toBeNull();
});

test('Scourge Vader grants its host a conditional second damage choice only when the first unit is defeated', () => {
  for (const lethal of [false, true]) {
    const p = position();
    p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'target', damage: lethal ? 2 : 0 }];
    p.attachments = [{ card: 'darth-vader--scourge-of-squadrons', unit: 'host' }];
    const g = scenario(p),
      pending = target(attack(g.state, g.refs.host!, g.state.players.bob!.base), g.refs.target!);
    if (lethal) {
      expect(pending.cards[g.refs.target!]!.zone).toBe('discard');
      resume(
        pending,
        choose(pending, i => i.kind === 'target' && i.card === g.state.players.bob!.base),
      );
      expect(
        target(pending, g.state.players.bob!.base).cards[g.state.players.bob!.base]!.damage,
      ).toBe(6);
    } else {
      expect(pending.execution.decision!.kind).toBe('action');
      expect(pending.cards[g.state.players.bob!.base]!.damage).toBe(5);
    }
  }
});

test('Hounds Tooth deals combat damage first only against an exhausted defender from an earlier phase', () => {
  for (const [exhausted, entered] of [
    [true, false],
    [false, false],
    [true, true],
  ]) {
    const p = position();
    p.players[0].space = [{ card: 'hound-s-tooth--reliable-and-deadly', ref: 'hound' }];
    p.players[1].space = [{ card: 'blockade-runner', ref: 'defender', exhausted }];
    if (entered) p.enteredThisPhase = ['defender'];
    const g = scenario(p),
      after = attack(g.state, g.refs.hound!, g.refs.defender!);
    expect(after.cards[g.refs.defender!]!.zone).toBe('discard');
    expect(after.cards[g.refs.hound!]!.zone).toBe(exhausted && !entered ? 'space' : 'discard');
  }
});

test('Arcana doubles its controller searches, stops on host ability loss and never affects an opponent', () => {
  for (const maps of [1]) {
    const p = playFixture('recruit');
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    p.players[0].deck = Array.from({ length: 30 }, () => ({ card: ids.marine }));
    p.attachments = Array.from({ length: maps }, () => ({
      card: 'arcana-star-map--path-to-peridea',
      unit: 'host',
    }));
    const g = scenario(p),
      searched = step(g.state, 'play');
    expect(searched.execution.decision!.selection!.cards).toHaveLength(5 * 2 ** maps);
    resume(searched, choose(searched, 'search', []));
    blank(g.state, g.refs.host!);
    expect(step(g.state, 'play').execution.decision!.selection!.cards).toHaveLength(5);
  }
  const p = playFixture('recruit');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'arcana-star-map--path-to-peridea', unit: 'enemy', owner: 'bob' }];
  const g = scenario(p);
  expect(step(g.state, 'play').execution.decision!.selection!.cards).toHaveLength(5);
});

test('Removing Nien upgrade abilities removes its imposed bonus while retaining its printed modifiers', () => {
  const p = playFixture('galen-erso--you-ll-never-win');
  p.players[1].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].ground = [{ card: 'clone-pilot' }];
  p.attachments = [{ card: 'nien-nunb--loyal-co-pilot', unit: 'host', owner: 'bob' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.host!]!).power).toBe(4);
  const pending = step(g.state, 'play');
  const after = advance(pending, {
    ...choose(pending, 'accept-effect'),
    namedCardId: 'nien-nunb--loyal-co-pilot',
  }).state;
  expect(unitStats(after, after.cards[g.refs.host!]!).power).toBe(3);
});
