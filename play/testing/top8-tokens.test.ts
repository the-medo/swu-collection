import { expect, test } from 'bun:test';
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

test('Protectorate Fighter requires a unique unit in play, not an undeployed leader or ordinary unit', () => {
  for (const unique of [false, true]) {
    const p = playFixture('protectorate-fighter');
    p.players[0].ground = [{ card: unique ? 'han-solo--it-ll-work' : ids.marine }];
    const g = scenario(p),
      after = step(g.state, 'play');
    expect(tokens(after, 'mandalorian')).toHaveLength(unique ? 1 : 0);
    if (unique)
      expect(upgrades(after, tokens(after, 'mandalorian')[0]!.instanceId)).toEqual(['shield']);
  }
});

test('Punch It attacks with a ready Vehicle and its two power expires immediately after combat', () => {
  const p = playFixture('punch-it');
  p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  p.players[0].space = [
    { card: ids.fighter, ref: 'fighter' },
    { card: ids.fighter, ref: 'exhausted', exhausted: true },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  const attackers = pending.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'attack' ? [o.intent.attacker] : [],
  );
  expect(new Set(attackers)).toEqual(new Set([g.refs.fighter!]));
  const after = attack(pending, g.refs.fighter!, pending.players.bob!.base);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(4);
  expect(unitStats(after, after.cards[g.refs.fighter!]!).power).toBe(2);
});

test('Blade Wing can return itself or another nonleader; leaders are excluded and the choice may be declined', () => {
  const p = playFixture('the-blade-wing--the-secret-of-shantipole');
  p.players[1].leader.deployedAs = 'unit';
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.options).not.toContainEqual(
    expect.objectContaining({ intent: { kind: 'target', card: pending.players.bob!.leader } }),
  );
  expect(target(pending, g.refs.played!).cards[g.refs.played!]!.zone).toBe('hand');
  expect(step(pending, 'decline-effect').cards[g.refs.played!]!.zone).toBe('space');
});

test('Accelerate Our Plans needs successful exhaustion, retains the other-unit binding, and adds three power only for the attack', () => {
  for (const exhausted of [false, true]) {
    const p = playFixture('accelerate-our-plans');
    p.players[0].ground = [
      { card: ids.marine, ref: 'cost', exhausted },
      { card: ids.marine, ref: 'attacker' },
    ];
    const g = scenario(p),
      pending = target(step(g.state, 'play'), g.refs.cost!);
    if (exhausted) {
      expect(pending.execution.decision!.kind).toBe('action');
      expect(pending.cards[g.refs.attacker!]!.exhausted).toBe(false);
    } else {
      resume(pending, choose(pending, 'attack'));
      const after = attack(pending, g.refs.attacker!, pending.players.bob!.base);
      expect(after.cards[after.players.bob!.base]!.damage).toBe(6);
      expect(unitStats(after, after.cards[g.refs.attacker!]!).power).toBe(3);
    }
  }
});

test('Asajj strengthens another friendly Force unit on play and attack, with phase expiry', () => {
  const p = playFixture('asajj-ventress--harden-your-heart');
  p.players[0].ground = [
    { card: 'jedi-consular', ref: 'ally' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.players[1].ground = [{ card: 'jedi-consular', ref: 'enemy' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.ally! },
  ]);
  const after = target(pending, g.refs.ally!);
  expect(unitStats(after, after.cards[g.refs.ally!]!).power).toBe(
    unitStats(g.state, g.state.cards[g.refs.ally!]!).power + 2,
  );
  const next = regroup(after);
  expect(unitStats(next, next.cards[g.refs.ally!]!).power).toBe(
    unitStats(g.state, g.state.cards[g.refs.ally!]!).power,
  );
  const attacked = target(attack(next, g.refs.played!, next.players.bob!.base), g.refs.ally!);
  expect(unitStats(attacked, attacked.cards[g.refs.ally!]!).power).toBe(
    unitStats(g.state, g.state.cards[g.refs.ally!]!).power + 2,
  );
});

test('Bail discards one actual hand card before creating a Spy; private choices survive recovery and can be declined', () => {
  const p = position();
  p.players[0].ground = [{ card: 'bail-organa--responding-to-catastrophe', ref: 'bail' }];
  p.players[0].hand = [{ card: 'force-illusion', ref: 'secret' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.bail!, g.state.players.bob!.base);
  expect(new Projector(pending.gameId, { role: 'spectator' }).project(pending).decision).toBeNull();
  resume(pending, choose(pending, 'accept-effect', [g.refs.secret!]));
  const after = step(pending, 'accept-effect', [g.refs.secret!]);
  expect(after.cards[g.refs.secret!]!.zone).toBe('discard');
  expect(tokens(after, 'spy')).toHaveLength(1);
  expect(tokens(step(pending, 'accept-effect'), 'spy')).toHaveLength(0);
});

test('Bossk may give both changes to the same unit or weaken another, and changes expire at regroup', () => {
  const p = position();
  p.players[0].ground = [{ card: 'bossk--join-our-merry-band', ref: 'bossk' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p),
    second = target(attack(g.state, g.refs.bossk!, g.state.players.bob!.base), g.refs.bossk!);
  const same = target(second, g.refs.bossk!);
  expect(unitStats(same, same.cards[g.refs.bossk!]!)).toMatchObject({ power: 3, hp: 5 });
  const other = target(second, g.refs.enemy!);
  expect(unitStats(other, other.cards[g.refs.enemy!]!)).toMatchObject({ power: 2, hp: 2 });
  expect(unitStats(regroup(other), other.cards[g.refs.enemy!]!)).toMatchObject({ power: 3, hp: 3 });
  expect(step(second, 'decline-effect').cards[g.state.players.bob!.base]!.damage).toBe(4);
});

test('Canto Bight Security forces attacks as Sentinel and creates the Credit for its defender controller', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'canto-bight-security', ref: 'security' }];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.state.players.bob!.base,
    ),
  ).toBe(false);
  const after = attack(g.state, g.refs.attacker!, g.refs.security!);
  expect(credits(after, 'bob')).toHaveLength(1);
  expect(credits(after, 'alice')).toHaveLength(0);
});

test('Cinta gains Sentinel from even a token upgrade and loses it when that upgrade is defeated', () => {
  const p = playFixture('open-fire');
  p.players[0].ground = [{ card: 'cinta-kaz--stone-cold-and-fearless', ref: 'cinta' }];
  p.attachments = [{ card: 'shield', unit: 'cinta', ref: 'shield' }];
  const g = scenario(p);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.cinta!]!).keywords).toContain('Sentinel');
  const after = target(step(g.state, 'play'), g.refs.cinta!);
  expect(effectiveAbilities(after, after.cards[g.refs.cinta!]!).keywords ?? []).not.toContain(
    'Sentinel',
  );
});

test('Cloud-Rider Veteran can damage either base independently of the defender', () => {
  const p = position();
  p.players[0].ground = [{ card: 'cloud-rider-veteran', ref: 'rider' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.rider!, g.state.players.bob!.base);
  const after = target(pending, g.state.players.alice!.base);
  expect(after.cards[after.players.alice!.base]!.damage).toBe(2);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(1);
});

test('Creditor Claim is controlled by its host, uses remaining HP, and captures the granted trigger before departure', () => {
  const p = playFixture('get-lost');
  p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[0].ground = [
    { card: ids.consular, ref: 'target', damage: 4 },
    { card: ids.consular, ref: 'healthy' },
  ];
  p.attachments = [{ card: 'creditor-s-claim', unit: 'host', owner: 'alice' }];
  const g = scenario(p),
    pending = target(step(g.state, 'play'), g.refs.host!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.target! },
    { kind: 'decline-effect' },
  ]);
  resume(pending, choose(pending, 'target'));
  expect(target(pending, g.refs.target!).cards[g.refs.target!]!.zone).toBe('discard');
});

test('Revan Lightsabers grant Grit only to a Sith and still add their printed modifiers to other nonvehicles', () => {
  for (const sith of [false, true]) {
    const p = position();
    p.players[0].ground = [
      { card: sith ? 'trayus-acolyte' : ids.consular, ref: 'host', damage: 2 },
    ];
    p.attachments = [{ card: 'darth-revan-s-lightsabers', unit: 'host' }];
    const g = scenario(p);
    expect(
      (effectiveAbilities(g.state, g.state.cards[g.refs.host!]!).keywords ?? []).includes('Grit'),
    ).toBe(sith);
    expect(unitStats(g.state, g.state.cards[g.refs.host!]!).power).toBe(sith ? 6 : 5);
  }
});

test('Dogged Pursuers may pay one resource to damage a ground unit; declining pays nothing', () => {
  const p = playFixture('dogged-pursuers');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  const paid = step(pending, 'accept-effect');
  expect(readyResourceCount(paid, 'alice')).toBe(readyResourceCount(pending, 'alice') - 1);
  expect(
    paid.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.space,
    ),
  ).toBe(false);
  expect(target(paid, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(2);
  expect(readyResourceCount(step(pending, 'decline-effect'), 'alice')).toBe(
    readyResourceCount(pending, 'alice'),
  );
});

test('Dornean Gunship counts friendly Vehicles including itself and lets the chosen recipient assign indirect damage', () => {
  const p = playFixture('dornean-gunship');
  p.players[0].space = [{ card: ids.fighter }];
  p.players[0].ground = [{ card: ids.marine }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy' }];
  const g = scenario(p),
    pending = step(step(g.state, 'play'), i => i.kind === 'choose-player' && i.playerId === 'bob');
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(pending.execution.decision!.selection!.min).toBe(2);
  resume(pending, choose(pending, 'accept-effect', [g.refs.enemy!, g.state.players.bob!.base]));
  const after = step(pending, 'accept-effect', [g.refs.enemy!, g.state.players.bob!.base]);
  expect(after.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(1);
});

test('Electromagnetic Pulse excludes ordinary units and exhausts its exact target even if a Shield prevents damage', () => {
  const p = playFixture('electromagnetic-pulse');
  p.players[1].ground = [
    { card: '8d8--daimyo-s-majordomo', ref: 'droid' },
    { card: ids.consular, ref: 'ordinary' },
  ];
  p.attachments = [{ card: 'shield', unit: 'droid' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.droid! },
  ]);
  const after = target(pending, g.refs.droid!);
  expect(after.cards[g.refs.droid!]!).toMatchObject({ damage: 0, exhausted: true });
  expect(upgrades(after, g.refs.droid!)).toEqual([]);
});

test('Executor creates three exhausted TIE Fighters on each of play, attack and defeat', () => {
  const card = 'executor--might-of-the-empire';
  const played = scenario(playFixture(card));
  expect(tokens(step(played.state, 'play'), 'tie-fighter')).toHaveLength(3);
  const p = position();
  p.players[0].space = [{ card, ref: 'executor' }];
  const g = scenario(p),
    attacked = attack(g.state, g.refs.executor!, g.state.players.bob!.base);
  expect(tokens(attacked, 'tie-fighter')).toHaveLength(3);
  expect(tokens(attacked, 'tie-fighter').every(c => c.exhausted)).toBe(true);
  const d = playFixture('get-lost');
  d.players[0].space = [{ card, ref: 'executor' }];
  d.attachments = [{ card: 'experience', unit: 'executor' }];
  const dead = scenario(d),
    after = target(step(dead.state, 'play'), dead.refs.executor!);
  expect(tokens(after, 'tie-fighter')).toHaveLength(3);
});

test('Fett Firespray creates a Credit for a defeated defender even when mutual damage defeats the Firespray', () => {
  for (const damage of [0, 4]) {
    const p = position();
    p.players[0].space = [{ card: 'fett-s-firespray--in-pursuit', ref: 'ship', damage }];
    p.players[1].space = [{ card: ids.fighter, ref: 'defender' }];
    const g = scenario(p),
      after = attack(g.state, g.refs.ship!, g.refs.defender!);
    expect(credits(after, 'alice')).toHaveLength(1);
    expect(after.cards[g.refs.ship!]!.zone).toBe(damage ? 'discard' : 'space');
  }
});

test('Fleet Interdictor defeats only space units with printed cost at most three', () => {
  const p = playFixture('get-lost');
  p.players[0].space = [{ card: 'fleet-interdictor', ref: 'source' }];
  p.attachments = [{ card: 'experience', unit: 'source' }];
  p.players[1].space = [
    { card: ids.fighter, ref: 'cheap' },
    { card: 'heroic-purrgil', ref: 'expensive', damage: 5 },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  const g = scenario(p),
    pending = target(step(g.state, 'play'), g.refs.source!);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.cheap! },
    { kind: 'decline-effect' },
  ]);
  expect(target(pending, g.refs.cheap!).cards[g.refs.cheap!]!.zone).toBe('discard');
});

test('Force Illusion grants Sentinel even without an enemy and expires at the phase boundary', () => {
  for (const enemy of [false, true]) {
    const p = playFixture('force-illusion');
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    if (enemy) p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let pending = step(g.state, 'play');
    if (enemy) {
      pending = target(pending, g.refs.enemy!);
      expect(pending.cards[g.refs.enemy!]!.exhausted).toBe(true);
    }
    const after = target(pending, g.refs.ally!);
    expect(effectiveAbilities(after, after.cards[g.refs.ally!]!).keywords).toContain('Sentinel');
    const next = regroup(after);
    expect(effectiveAbilities(next, next.cards[g.refs.ally!]!).keywords ?? []).not.toContain(
      'Sentinel',
    );
  }
});

test('Getaway Freighter creates a Credit only with a friendly ground unit', () => {
  for (const ground of [false, true]) {
    const p = position();
    p.players[0].space = [{ card: 'getaway-freighter', ref: 'ship' }];
    p.players[ground ? 0 : 1].ground = [{ card: ids.marine }];
    const g = scenario(p),
      after = attack(g.state, g.refs.ship!, g.state.players.bob!.base);
    expect(credits(after, 'alice')).toHaveLength(ground ? 1 : 0);
  }
});

test('Grappling Guardian checks remaining HP in space, irrespective of printed cost or controller', () => {
  const p = playFixture('grappling-guardian');
  p.players[0].space = [{ card: 'executor--might-of-the-empire', ref: 'six', damage: 6 }];
  p.players[1].space = [{ card: 'mercenary-fleet', ref: 'healthy' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.six! },
    { kind: 'decline-effect' },
  ]);
  const after = target(pending, g.refs.six!);
  expect(after.cards[g.refs.six!]!.zone).toBe('discard');
  expect(tokens(after, 'tie-fighter')).toHaveLength(3);
});

test('Halo Support gives its post-combat Shield to the borrowed attacker, not to Halo', () => {
  const p = playFixture('halo--not-according-to-plan');
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  resume(
    pending,
    choose(pending, i => i.kind === 'attack' && i.defender === g.refs.defender),
  );
  const after = attack(pending, g.refs.attacker!, g.refs.defender!);
  expect(after.cards[g.refs.attacker!]!.damage).toBe(3);
  expect(upgrades(after, g.refs.attacker!)).toEqual(['shield']);
  expect(upgrades(after, g.refs.played!)).toEqual([]);
});

test('Han takes three damage then may give three Advantage tokens to an enemy unit', () => {
  const p = playFixture('han-solo--it-ll-work');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.cards[g.refs.played!]!.damage).toBe(3);
  const after = target(pending, g.refs.enemy!);
  expect(upgrades(after, g.refs.enemy!)).toEqual(['advantage', 'advantage', 'advantage']);
});

test('Heightened Awareness grants one Advantage at regroup to its exact host, not its owner other units', () => {
  const p = position();
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [{ card: 'heightened-awareness', unit: 'host', owner: 'alice' }];
  const g = scenario(p),
    after = regroup(g.state);
  expect(upgrades(after, g.refs.host!)).toEqual(['heightened-awareness', 'advantage']);
});

test('Highsinger gives Experience to another friendly Command unit on play and a friendly Aggression unit on defeat', () => {
  const p = playFixture('highsinger--deadly-droid');
  p.players[0].ground = [
    { card: ids.marine, ref: 'command' },
    { card: ids.trooper, ref: 'aggression' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.command! },
  ]);
  expect(upgrades(target(pending, g.refs.command!), g.refs.command!)).toEqual(['experience']);
  const d = playFixture('get-lost');
  d.players[0].ground = [
    { card: 'highsinger--deadly-droid', ref: 'source' },
    { card: ids.trooper, ref: 'aggression' },
  ];
  d.attachments = [{ card: 'experience', unit: 'source' }];
  const dead = scenario(d),
    after = target(target(step(dead.state, 'play'), dead.refs.source!), dead.refs.aggression!);
  expect(upgrades(after, dead.refs.aggression!)).toEqual(['experience']);
});

test('Invasion Control Ship adds Raid only to friendly Droids and removes it when the aura source leaves', () => {
  const p = playFixture('get-lost');
  p.players[0].space = [{ card: 'invasion-control-ship', ref: 'ship' }];
  p.attachments = [{ card: 'experience', unit: 'ship' }];
  p.players[0].ground = [
    { card: '8d8--daimyo-s-majordomo', ref: 'droid' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.players[1].ground = [{ card: '8d8--daimyo-s-majordomo', ref: 'enemy' }];
  const g = scenario(p);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.droid!]!).raid).toBe(2);
  for (const id of ['marine', 'enemy'])
    expect(effectiveAbilities(g.state, g.state.cards[g.refs[id]!]!).raid ?? 0).toBe(0);
  const after = target(step(g.state, 'play'), g.refs.ship!);
  expect(effectiveAbilities(after, after.cards[g.refs.droid!]!).raid ?? 0).toBe(0);
});

test('Ki-Adi-Mundi spends Force to draw exactly two; declining or lacking Force draws nothing', () => {
  const p = playFixture('ki-adi-mundi--we-must-push-on');
  const empty = scenario(p);
  expect(step(empty.state, 'play').players.alice!.hand).toHaveLength(0);
  p.players[0].force = true;
  const g = scenario(p),
    pending = step(g.state, 'play');
  resume(pending, choose(pending, 'accept-effect'));
  const after = step(pending, 'accept-effect');
  expect(forceToken(after, 'alice')).toBeUndefined();
  expect(after.players.alice!.hand).toHaveLength(2);
  expect(step(pending, 'decline-effect').players.alice!.hand).toHaveLength(0);
});

test('Paige has no unit-side attack trigger; as a Pilot her host gains Experience before taking one damage', () => {
  const card = 'paige-tico--dropping-the-hammer';
  const p = position();
  p.players[0].ground = [{ card, ref: 'paige' }];
  const g = scenario(p),
    unit = attack(g.state, g.refs.paige!, g.state.players.bob!.base);
  expect(upgrades(unit, g.refs.paige!)).toEqual([]);
  expect(unit.cards[g.refs.paige!]!.damage).toBe(0);
  const d = playFixture(card);
  d.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  const pilot = scenario(d),
    played = step(
      pilot.state,
      i => i.kind === 'play' && i.piloting === 'piloting' && i.target === pilot.refs.host,
    );
  const after = attack(step(played, 'pass'), pilot.refs.host!, played.players.bob!.base);
  expect(upgrades(after, pilot.refs.host!)).toEqual([card, 'experience']);
  expect(after.cards[pilot.refs.host!]!.damage).toBe(1);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(5);
});

for (const [card, selected] of [
  ['prepare-for-takeoff', [ids.fighter, 'protectorate-fighter']],
  ['scour-the-archives', ['heightened-awareness']],
] as const) {
  test(`${card} limits the top-eight search by printed role and privately preserves exact choices through recovery`, () => {
    const p = playFixture(card);
    p.players[0].deck = [
      ids.marine,
      ...selected,
      'paige-tico--dropping-the-hammer',
      ...Array.from({ length: 8 }, () => ids.marine),
    ].map((card, n) => ({ card, ref: 'deck' + n }));
    const g = scenario(p),
      pending = step(g.state, 'play');
    const selection = pending.execution.decision!.selection!;
    const wanted = selected.map((_, n) => g.refs['deck' + (n + 1)]!);
    expect(selection.cards).toEqual(wanted);
    expect(selection.max).toBe(selected.length);
    expect(
      new Projector(pending.gameId, { role: 'spectator' }).project(pending).decision,
    ).toBeNull();
    resume(pending, choose(pending, 'search', wanted));
    const searched = step(pending, 'search', wanted);
    const after = advance(searched, {
      type: 'random',
      gameId: searched.gameId,
      expectedRevision: searched.revision,
      requestId: searched.execution.random!.id,
      values: searched.execution.random!.bounds.map(() => 0),
    }).state;
    expect(after.players.alice!.hand).toEqual(wanted);
    expect(after.players.alice!.deck[0]).toBe(g.refs.deck8!);
  });
}

test('Shield Drive Outfitter permits paying a resource for a Shield on any unit and permits declining', () => {
  const p = playFixture('shield-drive-outfitter');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  const after = target(step(pending, 'accept-effect'), g.refs.enemy!);
  expect(upgrades(after, g.refs.enemy!)).toEqual(['shield']);
  expect(readyResourceCount(after, 'alice')).toBe(readyResourceCount(pending, 'alice') - 1);
  expect(upgrades(step(pending, 'decline-effect'), g.refs.enemy!)).toEqual([]);
});

test('Smuggler YT-2400 can pay for its boost before Ambush, and the boost expires next phase', () => {
  const p = playFixture('smuggler-s-yt-2400');
  p.players[1].space = [{ card: 'mercenary-fleet', ref: 'enemy' }];
  const g = scenario(p),
    pending = step(g.state, 'play');
  const paid = step(trigger(pending, 'paid-boost'), 'accept-effect');
  const after = target(paid, g.refs.enemy!);
  expect(after.cards[g.refs.enemy!]!.damage).toBe(5);
  expect(unitStats(after, after.cards[g.refs.played!]!)).toMatchObject({ power: 5, hp: 6 });
  const next = regroup(after);
  expect(unitStats(next, next.cards[g.refs.played!]!)).toMatchObject({ power: 4, hp: 5 });
});

test('Stronger Together creates two exhausted Shielded Mandalorians as separate exact instances', () => {
  const g = scenario(playFixture('stronger-together'));
  let after = step(g.state, 'play');
  while (after.execution.decision?.kind === 'trigger') after = step(after, 'trigger');
  const units = tokens(after, 'mandalorian');
  expect(units).toHaveLength(2);
  expect(new Set(units.map(c => c.instanceId)).size).toBe(2);
  for (const unit of units) {
    expect(unit.exhausted).toBe(true);
    expect(upgrades(after, unit.instanceId)).toEqual(['shield']);
  }
});

test('Galleon requires two Aggression and one Villainy icons to disclose and creates three Spies without discarding the revealed cards', () => {
  const p = playFixture('the-galleon--marauding-pirate-ship');
  p.players[0].hand!.push({ card: ids.trooper, ref: 'one' }, { card: ids.trooper, ref: 'two' });
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'play' && i.card === g.refs.played);
  expect(() => step(pending, 'accept-effect', [g.refs.one!])).toThrow();
  resume(pending, choose(pending, 'accept-effect', [g.refs.one!, g.refs.two!]));
  const after = step(pending, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(tokens(after, 'spy')).toHaveLength(3);
  expect(after.players.alice!.hand).toHaveLength(2);
  expect(tokens(step(pending, 'decline-effect'), 'spy')).toHaveLength(0);
});

test('Max Rebo Band creates one Credit when regroup starts, irrespective of exhaustion', () => {
  const p = position();
  p.players[0].ground = [{ card: 'the-max-rebo-band--jatz-wailers', exhausted: true }];
  const g = scenario(p),
    after = regroup(g.state);
  expect(credits(after, 'alice')).toHaveLength(1);
});

test('Torpedo Barrage may choose its own player and assigns exactly five unpreventable damage', () => {
  const g = scenario(playFixture('torpedo-barrage'));
  const pending = step(
    step(g.state, 'play'),
    i => i.kind === 'choose-player' && i.playerId === 'alice',
  );
  const after = step(
    pending,
    'accept-effect',
    Array.from({ length: 5 }, () => g.state.players.alice!.base),
  );
  expect(after.cards[after.players.alice!.base]!.damage).toBe(5);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(0);
});

test('Zuckuss needs another friendly Bounty Hunter and uses modified power for damage to a ground unit', () => {
  for (const ally of [false, true]) {
    const p = position();
    p.players[0].ground = [{ card: 'zuckuss--dangerous', ref: 'zuckuss' }];
    if (ally) p.players[0].ground!.push({ card: 'asajj-ventress--harden-your-heart' });
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    p.attachments = [{ card: 'preparation', unit: 'zuckuss' }];
    const g = scenario(p);
    let after = trigger(
      attack(g.state, g.refs.zuckuss!, g.state.players.bob!.base),
      'bounty-hunter-damage',
    );
    if (ally) after = target(after, g.refs.target!);
    expect(after.cards[g.refs.target!]!.damage).toBe(ally ? 5 : 0);
  }
});
