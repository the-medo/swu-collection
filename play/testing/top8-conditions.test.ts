import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
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

test('Vader Meet Your Destiny is Shielded on entry and has Sentinel only while ready', () => {
  const p = playFixture('darth-vader--meet-your-destiny'),
    g = scenario(p),
    played = step(g.state, 'play');
  expect(upgrades(played, g.refs.played!)).toEqual(['shield']);
  expect(effectiveAbilities(played, played.cards[g.refs.played!]!).keywords ?? []).not.toContain(
    'Sentinel',
  );
  const next = regroup(played);
  expect(effectiveAbilities(next, next.cards[g.refs.played!]!).keywords).toContain('Sentinel');
  const after = attack(next, g.refs.played!, next.players.bob!.base);
  expect(effectiveAbilities(after, after.cards[g.refs.played!]!).keywords ?? []).not.toContain(
    'Sentinel',
  );
});

test('Lothal E-Wing restores two only when an enemy unit is upgraded, including by a token', () => {
  for (const enemy of [false, true]) {
    const p = position();
    p.players[0].base.damage = 5;
    p.players[0].space = [{ card: 'lothal-e-wing', ref: 'wing' }];
    p.players[enemy ? 1 : 0].ground = [{ card: ids.marine, ref: 'upgraded' }];
    p.attachments = [{ card: 'experience', unit: 'upgraded' }];
    const g = scenario(p),
      after = attack(g.state, g.refs.wing!, g.state.players.bob!.base);
    expect(after.cards[after.players.alice!.base]!.damage).toBe(enemy ? 3 : 5);
  }
});

test('Flarestar may grant Advantage on entry and from a captured defeated trigger', () => {
  const p = playFixture('flarestar-attack-shuttle');
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p),
    after = target(step(g.state, 'play'), g.refs.target!);
  expect(upgrades(after, g.refs.target!)).toEqual(['advantage']);
  const d = playFixture('open-fire');
  d.players[0].space = [{ card: 'flarestar-attack-shuttle', ref: 'ship' }];
  d.players[0].ground = [{ card: ids.consular, ref: 'target' }];
  const dead = scenario(d),
    pending = target(step(dead.state, 'play'), dead.refs.ship!);
  expect(pending.cards[dead.refs.ship!]!.zone).toBe('discard');
  expect(upgrades(target(pending, dead.refs.target!), dead.refs.target!)).toEqual(['advantage']);
  expect(upgrades(step(pending, 'decline-effect'), dead.refs.target!)).toEqual([]);
});

test('Dodging Patrols makes independent optional choices restricted to each arena', () => {
  const p = position();
  p.players[0].space = [{ card: 'millennium-falcon--dodging-patrols', ref: 'falcon' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.falcon!, g.state.players.bob!.base);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.falcon! },
    { kind: 'decline-effect' },
  ]);
  const second = step(pending, 'decline-effect'),
    after = target(second, g.refs.ground!);
  expect(unitStats(after, after.cards[g.refs.ground!]!).power).toBe(5);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(2);
  const lowered = step(target(pending, g.refs.falcon!), 'decline-effect');
  expect(lowered.cards[lowered.players.bob!.base]!.damage).toBe(0);
  expect(unitStats(regroup(after), after.cards[g.refs.ground!]!).power).toBe(3);
});

test('Tip the Scale privately inspects the opponent hand and excludes a Pilot as a printed unit', () => {
  const p = playFixture('tip-the-scale');
  p.players[1].hand = [
    { card: 'paige-tico--dropping-the-hammer', ref: 'pilot' },
    { card: 'open-fire', ref: 'event' },
    { card: 'battle-fury', ref: 'upgrade' },
  ];
  const g = scenario(p),
    pending = step(g.state, 'play');
  expect(pending.execution.decision!.selection!.cards).toEqual([g.refs.event!, g.refs.upgrade!]);
  expect(() => step(pending, 'accept-effect', [g.refs.pilot!])).toThrow();
  for (const viewer of [{ role: 'player', playerId: 'bob' }, { role: 'spectator' }] as const)
    expect(new Projector(pending.gameId, viewer).project(pending).decision).toBeNull();
  resume(pending, choose(pending, 'accept-effect', [g.refs.upgrade!]));
  const after = step(pending, 'accept-effect', [g.refs.upgrade!]);
  expect(after.cards[g.refs.upgrade!]!.zone).toBe('discard');
  expect(after.cards[g.refs.pilot!]!.zone).toBe('hand');
});

test('Dilapidated Ski Speeder takes three damage on entry without changing its printed HP', () => {
  const g = scenario(playFixture('dilapidated-ski-speeder')),
    after = step(g.state, 'play');
  expect(after.cards[g.refs.played!]!.damage).toBe(3);
  expect(unitStats(after, after.cards[g.refs.played!]!)).toMatchObject({ power: 3, hp: 7 });
});

test('Defenders of the Forest Ambush for five with excess damage to the base', () => {
  const p = playFixture('defenders-of-the-forest');
  p.players[1].ground = [{ card: ids.marine, ref: 'defender', damage: 1 }];
  const g = scenario(p),
    after = target(step(g.state, 'play'), g.refs.defender!);
  expect(after.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(after.cards[after.players.bob!.base]!.damage).toBe(3);
  expect(after.cards[g.refs.played!]!.zone).toBe('discard');
});

test('Trust Your Instincts requires Force and deals boosted combat damage first, preventing a defeated defender from striking back', () => {
  const p = playFixture('trust-your-instincts');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const empty = scenario(p),
    noForce = step(empty.state, 'play');
  expect(noForce.execution.decision!.kind).toBe('action');
  expect(noForce.cards[empty.refs.attacker!]!.exhausted).toBe(false);
  p.players[0].force = true;
  const g = scenario(p);
  let pending = step(g.state, 'play');
  if (pending.execution.decision?.options.some(o => o.intent.kind === 'accept-effect'))
    pending = step(pending, 'accept-effect');
  pending = target(pending, g.refs.attacker!);
  resume(
    pending,
    choose(pending, i => i.kind === 'attack' && i.defender === g.refs.defender),
  );
  const after = attack(pending, g.refs.attacker!, g.refs.defender!);
  expect(forceToken(after, 'alice')).toBeUndefined();
  expect(after.cards[g.refs.attacker!]!.damage).toBe(0);
  expect(after.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(unitStats(after, after.cards[g.refs.attacker!]!).power).toBe(3);
});

test('Mighty Rescuer gains Experience then heals after defeating a defender; a base attack does neither', () => {
  const p = position();
  p.players[0].ground = [{ card: 'chewbacca--mighty-rescuer', ref: 'chewie', damage: 1 }];
  p.players[1].ground = [{ card: 'palace-chef-droid', ref: 'defender' }];
  const g = scenario(p),
    after = attack(g.state, g.refs.chewie!, g.refs.defender!);
  expect(upgrades(after, g.refs.chewie!)).toEqual(['experience']);
  expect(after.cards[g.refs.chewie!]!.damage).toBe(0);
  p.players[1].ground = [];
  const b = scenario(p),
    base = attack(b.state, b.refs.chewie!, b.state.players.bob!.base);
  expect(upgrades(base, b.refs.chewie!)).toEqual([]);
  expect(base.cards[b.refs.chewie!]!.damage).toBe(1);
});

test('Kelleran counts zero-power units from either player and responds immediately to a change in power', () => {
  const p = playFixture('electromagnetic-pulse');
  p.players[0].ground = [
    { card: 'kelleran-beq--where-are-the-others-', ref: 'beq' },
    { card: 'spy' },
  ];
  p.players[1].ground = [
    { card: 'palace-chef-droid', ref: 'chef', damage: 1 },
    { card: ids.marine },
  ];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.beq!]!).power).toBe(5);
  const after = target(step(g.state, 'play'), g.refs.chef!);
  expect(unitStats(after, after.cards[g.refs.beq!]!).power).toBe(4);
});

test('Battle Fury forces the host controller to discard, regardless of who owns the upgrade', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.players[0].hand = [{ card: ids.fighter, ref: 'discard' }];
  p.attachments = [{ card: 'battle-fury', unit: 'host', owner: 'bob' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.host!, g.state.players.bob!.base);
  expect(pending.execution.decision!.playerId).toBe('alice');
  expect(pending.execution.decision!.selection!.min).toBe(1);
  expect(() => step(pending, 'accept-effect')).toThrow();
  expect(step(pending, 'accept-effect', [g.refs.discard!]).cards[g.refs.discard!]!.zone).toBe(
    'discard',
  );
});

test('Vader leader pays one plus exhaustion on the leader face and damages two on the unit face without that payment', () => {
  const p = position();
  p.players[0].leader = { card: 'darth-vader--don-t-fail-me-again', ref: 'vader' };
  p.players[0].resources = [{ card: ids.marine }];
  const g = scenario(p);
  const pending = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'damage-base');
  expect(pending.cards[g.refs.vader!]!.exhausted).toBe(true);
  expect(readyResourceCount(pending, 'alice')).toBe(0);
  expect(
    target(pending, g.state.players.alice!.base).cards[g.state.players.alice!.base]!.damage,
  ).toBe(1);
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].resources = [];
  const u = scenario(p);
  expect(
    u.state.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === u.refs.vader,
    ),
  ).toBe(false);
  const attacked = target(
    attack(u.state, u.refs.vader!, u.state.players.bob!.base),
    u.state.players.alice!.base,
  );
  expect(attacked.cards[u.state.players.alice!.base]!.damage).toBe(2);
  expect(attacked.cards[u.state.players.bob!.base]!.damage).toBe(3);
});

test('Jabba Rancor opponent chooses a ground unit, then the attacker controller chooses whether to deal seven damage', () => {
  const p = position();
  p.players[0].ground = [{ card: 'jabba-s-rancor--snack-time-', ref: 'rancor' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'chosen' },
    { card: ids.marine, ref: 'other' },
  ];
  const g = scenario(p),
    choice = attack(g.state, g.refs.rancor!, g.state.players.bob!.base);
  expect(choice.execution.decision!.playerId).toBe('bob');
  const pending = target(choice, g.refs.chosen!);
  expect(pending.execution.decision!.playerId).toBe('alice');
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'deal-seven'),
  );
  const after = step(pending, i => i.kind === 'choose-mode' && i.mode === 'deal-seven');
  expect(after.cards[g.refs.chosen!]!.zone).toBe('discard');
  expect(
    step(pending, i => i.kind === 'choose-mode' && i.mode === 'decline').cards[g.refs.chosen!]!
      .zone,
  ).toBe('ground');
});

test('Purrgil Ultra returns another friendly unit and retains its printed cost through the later damage choice', () => {
  const p = playFixture('purrgil-ultra');
  p.players[0].ground = [{ card: ids.consular, ref: 'returned' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    first = step(g.state, 'play');
  expect(first.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.returned! },
    { kind: 'decline-effect' },
  ]);
  const pending = target(first, g.refs.returned!);
  expect(pending.cards[g.refs.returned!]!.zone).toBe('hand');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  expect(target(pending, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(4);
  expect(step(first, 'decline-effect').cards[g.refs.enemy!]!.damage).toBe(0);
});

test('Purrgil King draws once for each friendly unit with seven remaining HP including itself and restores four on attack', () => {
  const p = playFixture('the-purrgil-king--leading-the-journey');
  p.players[0].base.damage = 5;
  p.players[0].ground = [{ card: ids.consular }, { card: ids.consular, damage: 1 }];
  p.players[1].ground = [{ card: ids.consular }];
  const g = scenario(p),
    after = step(g.state, 'play');
  expect(after.players.alice!.hand).toHaveLength(2);
  const next = regroup(after),
    attacked = attack(next, g.refs.played!, next.players.bob!.base);
  expect(attacked.cards[next.players.alice!.base]!.damage).toBe(1);
});

test('Red Squadron X-Wing may take two damage to draw, or decline both effects', () => {
  const g = scenario(playFixture('red-squadron-x-wing')),
    pending = step(g.state, 'play');
  const after = step(pending, i => i.kind === 'choose-mode' && i.mode === 'damage-and-draw');
  expect(after.cards[g.refs.played!]!.damage).toBe(2);
  expect(after.players.alice!.hand).toHaveLength(1);
  const declined = step(pending, i => i.kind === 'choose-mode' && i.mode === 'decline');
  expect(declined.players.alice!.hand).toHaveLength(0);
  expect(declined.cards[g.refs.played!]!.damage).toBe(0);
});

test('Diplomatic Immunity requires the four disclosed icons and reduces the exact attacker for this attack', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  p.players[1].hand = [
    { card: 'paige-tico--dropping-the-hammer', ref: 'one' },
    { card: 'paige-tico--dropping-the-hammer', ref: 'two' },
  ];
  p.attachments = [{ card: 'diplomatic-immunity', unit: 'defender', owner: 'alice' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.attacker!, g.refs.defender!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(() => step(pending, 'accept-effect', [g.refs.one!])).toThrow();
  resume(pending, choose(pending, 'accept-effect', [g.refs.one!, g.refs.two!]));
  const after = step(pending, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(after.cards[g.refs.defender!]!.damage).toBe(1);
  expect(unitStats(after, after.cards[g.refs.attacker!]!).power).toBe(3);
});

test('Salacious enters ready only with a friendly Jabba, and attacks with Raid two', () => {
  for (const friendly of [false, true]) {
    const p = playFixture('salacious-crumb--cackling-companion');
    p.players[friendly ? 0 : 1].ground = [{ card: 'jabba-the-hutt--eminence-of-tatooine' }];
    const g = scenario(p),
      after = step(g.state, 'play');
    expect(after.cards[g.refs.played!]!.exhausted).toBe(!friendly);
    if (friendly) {
      const attacked = attack(step(after, 'pass'), g.refs.played!, after.players.bob!.base);
      expect(attacked.cards[after.players.bob!.base]!.damage).toBe(2);
    }
  }
});

test('Transmission Jamming blocks a chosen title for both players until the phase ends', () => {
  const p = playFixture('transmission-jamming');
  p.players[0].hand!.push({ card: ids.marine, ref: 'own' });
  p.players[1].hand = [{ card: ids.marine, ref: 'named' }];
  p.players[1].resources = Array.from({ length: 4 }, () => ({ card: ids.marine }));
  const g = scenario(p),
    pending = step(g.state, 'play');
  const input = { ...choose(pending, 'accept-effect'), namedCardId: 'battlefield-marine' };
  const after = advance(pending, input).state;
  expect(
    after.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.named,
    ),
  ).toBe(false);
  const ownTurn = step(after, 'pass');
  expect(
    ownTurn.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.own,
    ),
  ).toBe(false);
  resume(after, choose(after, 'pass'));
  const next = step(regroup(after), 'pass');
  expect(
    next.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.named,
    ),
  ).toBe(true);
});

test('Bucket of Bolts checks strictly more base damage on entry, not equal damage', () => {
  for (const damage of [4, 5, 6]) {
    const p = playFixture('millennium-falcon--bucket-of-bolts');
    p.players[0].base.damage = damage;
    p.players[1].base.damage = 5;
    const g = scenario(p),
      after = step(g.state, 'play');
    expect(after.cards[g.refs.played!]!.exhausted).toBe(damage <= 5);
  }
});

test('Palace Chef has two power while defending and zero while attacking or idle', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: 'palace-chef-droid', ref: 'chef' }];
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.chef!]!).power).toBe(0);
  const after = attack(g.state, g.refs.attacker!, g.refs.chef!);
  expect(after.cards[g.refs.attacker!]!.damage).toBe(2);
  p.activePlayer = 'bob';
  const d = scenario(p),
    attacked = attack(d.state, d.refs.chef!, d.state.players.alice!.base);
  expect(attacked.cards[d.state.players.alice!.base]!.damage).toBe(0);
});

test('Rose leader heals only a Vehicle whose exact incarnation attacked this phase; her unit side removes that restriction', () => {
  const p = position();
  p.players[0].leader = { card: 'rose-tico--saving-what-we-love', ref: 'rose' };
  p.players[0].space = [
    { card: 'mercenary-fleet', ref: 'attacked', damage: 3 },
    { card: 'mercenary-fleet', ref: 'idle', damage: 3 },
  ];
  p.players[0].ground = [{ card: ids.consular, ref: 'ground', damage: 3 }];
  p.attackedThisPhase = ['attacked', 'ground'];
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'heal-vehicle');
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.attacked! },
  ]);
  expect(target(pending, g.refs.attacked!).cards[g.refs.attacked!]!.damage).toBe(1);
  p.players[0].leader.deployedAs = 'unit';
  const u = scenario(p),
    choice = attack(u.state, u.refs.rose!, u.state.players.bob!.base);
  expect(target(choice, u.refs.idle!).cards[u.refs.idle!]!.damage).toBe(1);
});

test('Obi-Wan leader pays Force and exhaustion, excludes Experience-bearing units, and his attack ability excludes himself', () => {
  const p = position();
  p.players[0].leader = { card: 'obi-wan-kenobi--courage-makes-heroes', ref: 'obi' };
  p.players[0].force = true;
  p.players[0].ground = [
    { card: ids.marine, ref: 'experienced' },
    { card: ids.marine, ref: 'shielded' },
  ];
  p.attachments = [
    { card: 'experience', unit: 'experienced' },
    { card: 'shield', unit: 'shielded' },
  ];
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'experience');
  expect(forceToken(pending, 'alice')).toBeUndefined();
  expect(pending.cards[g.refs.obi!]!.exhausted).toBe(true);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.shielded! },
  ]);
  expect(upgrades(target(pending, g.refs.shielded!), g.refs.shielded!)).toEqual([
    'shield',
    'experience',
  ]);
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].force = false;
  const u = scenario(p),
    choice = attack(u.state, u.refs.obi!, u.state.players.bob!.base);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: u.refs.shielded! },
    { kind: 'decline-effect' },
  ]);
});

test('Avar deploys using resource count plus actual Force uses, paying no resources and preserving Epic usage', () => {
  const p = playFixture('ki-adi-mundi--we-must-push-on');
  p.players[0].resources = p.players[0].resources!.slice(0, 8);
  p.players[0].leader = { card: 'avar-kriss--marshal-of-starlight', ref: 'avar' };
  p.players[0].force = true;
  const g = scenario(p),
    used = step(step(g.state, 'play'), 'accept-effect');
  expect(used.phaseHistory.forceUsed.alice).toBe(1);
  const pending = step(used, 'pass');
  resume(
    pending,
    choose(pending, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
  );
  const deployed = step(pending, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(deployed.cards[g.refs.avar!]!).toMatchObject({
    deployedAs: 'unit',
    exhausted: false,
    abilityUses: { deploy: 1 },
  });
  expect(readyResourceCount(deployed, 'alice')).toBe(readyResourceCount(pending, 'alice'));
  expect(unitStats(deployed, deployed.cards[g.refs.avar!]!).power).toBe(4);
});

test('Avar Force bonus belongs only to her unit face and deployment reductions reset with phase history', () => {
  const p = position();
  p.players[0].leader = { card: 'avar-kriss--marshal-of-starlight', ref: 'avar' };
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  const g = scenario(p),
    gained = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'gain-force');
  expect(forceToken(gained, 'alice')).toBeDefined();
  expect(gained.cards[g.refs.avar!]!.exhausted).toBe(true);
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].force = true;
  const u = scenario(p);
  expect(unitStats(u.state, u.state.cards[u.refs.avar!]!).power).toBe(8);
  expect(effectiveAbilities(u.state, u.state.cards[u.refs.avar!]!).keywords).toContain('Overwhelm');
  const copy = structuredClone(g.state);
  copy.phaseHistory.forceUsed.alice = 1;
  copy.execution.decision = null;
  settle(copy);
  const next = regroup(copy);
  expect(next.phaseHistory.forceUsed.alice ?? 0).toBe(0);
  const attempted = step(next, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(attempted.cards[g.refs.avar!]!.deployedAs).toBeNull();
});

test('Grogu heals up to two from exactly one unit and deals only the amount actually healed, with recoverable choices', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'grogu--mysterious-child', ref: 'grogu' },
    { card: ids.consular, ref: 'heal', damage: 2 },
    { card: ids.consular, ref: 'other', damage: 2 },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'damage' }];
  const g = scenario(p),
    pending = target(
      step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'heal-damage'),
      g.refs.heal!,
    );
  expect(pending.execution.decision!.selection!.cards).toEqual([g.refs.heal!]);
  expect(() => step(pending, 'accept-effect', [g.refs.heal!, g.refs.other!])).toThrow();
  resume(pending, choose(pending, 'accept-effect', [g.refs.heal!]));
  const choice = step(pending, 'accept-effect', [g.refs.heal!]);
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === g.refs.damage),
  );
  const after = target(choice, g.refs.damage!);
  expect(after.cards[g.refs.heal!]!.damage).toBe(1);
  expect(after.cards[g.refs.damage!]!.damage).toBe(1);
  expect(after.cards[g.refs.grogu!]!.exhausted).toBe(true);
  const declined = step(pending, 'accept-effect');
  expect(declined.execution.decision!.kind).toBe('action');
  expect(declined.cards[g.refs.damage!]!.damage).toBe(0);
});
