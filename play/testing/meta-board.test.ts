import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = () => Array.from({ length: 12 }, () => ({ card: ids.marine }));
function step(
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) {
  return advance(s, choose(s, i, selections)).state;
}
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function playCard(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
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
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function trigger(s: GameState, id: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function nextRound(s: GameState) {
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

test('Collateral Damage retains the defeated first target arena and permits either base or another unit', () => {
  const p = playCard('collateral-damage');
  p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[1].space = [
    { card: ids.fighter, ref: 'first' },
    { card: 'x-wing', ref: 'second' },
  ];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.first!);
  expect(choice.cards[s.refs.first!]!.zone).toBe('discard');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.second! },
    { kind: 'target', card: choice.players.alice!.base },
    { kind: 'target', card: choice.players.bob!.base },
  ]);
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.second),
  );
  expect(target(choice, s.refs.second!).cards[s.refs.second!]!.zone).toBe('set-aside');
  expect(target(choice, choice.players.bob!.base).cards[choice.players.bob!.base]!.damage).toBe(2);
  const noUnits = scenario(playCard('collateral-damage')),
    bases = step(noUnits.state, 'play');
  expect(target(bases, bases.players.bob!.base).cards[bases.players.bob!.base]!.damage).toBe(2);
});

test('Let’s Call It War requires initiative and excludes the first target; Shoot Down requires that damage to defeat its target', () => {
  for (const initiative of [false, true]) {
    const p = playCard('let-s-call-it-war');
    p.initiative.holder = initiative ? 'alice' : 'bob';
    p.players[1].ground = [
      { card: ids.marine, ref: 'first' },
      { card: ids.consular, ref: 'second' },
    ];
    const s = scenario(p),
      after = target(step(s.state, 'play'), s.refs.first!);
    if (initiative) {
      expect(after.execution.decision!.options.map(o => o.intent)).toEqual([
        { kind: 'target', card: s.refs.second! },
        { kind: 'decline-effect' },
      ]);
      expect(target(after, s.refs.second!).cards[s.refs.second!]!.damage).toBe(2);
    } else expect(after.execution.decision!.kind).toBe('action');
  }
  const p = playCard('shoot-down');
  p.players[1].space = [{ card: 'x-wing', ref: 'unit' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.unit!);
  expect(choice.cards[s.refs.unit!]!.zone).toBe('set-aside');
  expect(target(choice, choice.players.bob!.base).cards[choice.players.bob!.base]!.damage).toBe(2);
  p.attachments = [{ card: 'shield', unit: 'unit' }];
  const shield = scenario(p);
  expect(target(step(shield.state, 'play'), shield.refs.unit!).execution.decision!.kind).toBe(
    'action',
  );
});

test('Barriss heals only available damage, offers up to two, and grants exactly that many Advantage tokens', () => {
  for (const damage of [0, 1, 3]) {
    const p = playCard('barriss-offee--redeeming-herself');
    p.players[1].ground = [{ card: ids.consular, ref: 'patient', damage }];
    const s = scenario(p),
      amount = target(step(s.state, 'play'), s.refs.patient!);
    const input = choose(amount, i => i.kind === 'choose-mode' && i.mode === 'heal-2');
    resume(amount, input);
    const after = advance(amount, input).state;
    expect(after.cards[s.refs.patient!]!.damage).toBe(Math.max(0, damage - 2));
    expect(upgrades(after, s.refs.patient!)).toHaveLength(Math.min(2, damage));
    const zero = step(amount, i => i.kind === 'choose-mode' && i.mode === 'heal-0');
    expect(zero.cards[s.refs.patient!]!.damage).toBe(damage);
    expect(upgrades(zero, s.refs.patient!)).toEqual([]);
  }
});

test('Home One heals every friendly unit in both arenas, and Unity counts each name once', () => {
  const p = playCard('home-one--heart-of-the-fleet');
  p.players[0].ground = [{ card: ids.consular, ref: 'ground', damage: 5 }];
  p.players[0].space = [{ card: 'x-wing', ref: 'space', damage: 1 }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: 3 }];
  const s = scenario(p),
    after = step(s.state, 'play');
  expect(after.cards[s.refs.ground!]!.damage).toBe(0);
  expect(after.cards[s.refs.space!]!.damage).toBe(0);
  expect(after.cards[s.refs.enemy!]!.damage).toBe(3);
  const q = playCard('unity-of-purpose');
  q.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: ids.consular, ref: 'three' },
  ];
  const t = scenario(q),
    buff = step(t.state, 'play');
  expect(unitStats(buff, buff.cards[t.refs.one!]!)).toEqual({ power: 5, hp: 5 });
  expect(unitStats(buff, buff.cards[t.refs.three!]!)).toEqual({ power: 5, hp: 9 });
  expect(unitStats(nextRound(buff), buff.cards[t.refs.two!]!).power).toBe(3);
});

test('Lawbringer chooses one aspect and Bo-Katan reduces enemy units then observes each defeat', () => {
  const p = playCard('lawbringer--shadow-over-lothal');
  p.players[0].ground = [{ card: ids.marine, ref: 'friend' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: ids.consular, ref: 'other' },
  ];
  const s = scenario(p),
    mode = step(s.state, 'play');
  resume(
    mode,
    choose(mode, i => i.kind === 'choose-mode' && i.mode === 'command'),
  );
  const after = step(mode, i => i.kind === 'choose-mode' && i.mode === 'command');
  expect(unitStats(after, after.cards[s.refs.enemy!]!)).toEqual({ power: 1, hp: 1 });
  expect(unitStats(after, after.cards[s.refs.friend!]!).power).toBe(3);
  expect(unitStats(after, after.cards[s.refs.other!]!).power).toBe(3);
  const q = playCard('bo-katan-kryze--alone');
  q.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const t = scenario(q),
    reward = step(t.state, 'play');
  expect(reward.cards[t.refs.enemy!]!.zone).toBe('discard');
  expect(upgrades(target(reward, t.refs.played!), t.refs.played!)).toEqual(['experience']);
});

test('Kanan, Zeb and Ezra use the larger effect only with the specified friendly aspects', () => {
  for (const condition of [false, true]) {
    const p = playCard('zeb-orellios--spectre-four');
    if (condition) p.players[0].ground = [{ card: ids.marine }];
    p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
    const s = scenario(p),
      after = target(step(s.state, 'play'), s.refs.unit!);
    expect(after.cards[s.refs.unit!]!.damage).toBe(condition ? 5 : 3);
    const q = playCard('kanan-jarrus--spectre-one');
    if (condition) q.players[0].ground = [{ card: ids.marine }];
    q.players[1].ground = [{ card: 'grogu--yes--yes--yes-', ref: 'unit' }];
    const t = scenario(q),
      bounce = step(t.state, 'play');
    expect(
      bounce.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === t.refs.unit,
      ),
    ).toBe(condition);
    if (condition) expect(target(bounce, t.refs.unit!).cards[t.refs.unit!]!.zone).toBe('hand');
    const r = playCard('ezra-bridger--spectre-six');
    if (condition) r.players[0].ground = [{ card: ids.trooper }];
    r.players[1].ground = [{ card: ids.consular, ref: 'unit', damage: 5 }];
    const u = scenario(r);
    expect(target(step(u.state, 'play'), u.refs.unit!).cards[u.refs.unit!]!.damage).toBe(
      condition ? 1 : 3,
    );
  }
});

test('Nothing Left to Fear compares to the buffed friendly unit and can defeat units of equal power', () => {
  const p = playCard('nothing-left-to-fear');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [
    { card: 'dedra-meero--with-verifiable-data', ref: 'equal' },
    { card: 'pre-vizsla--strong-willed-ruler', ref: 'larger' },
  ];
  const s = scenario(p),
    removal = target(step(s.state, 'play'), s.refs.ally!);
  expect(
    removal.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.equal,
    ),
  ).toBe(true);
  expect(
    removal.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.larger,
    ),
  ).toBe(false);
  expect(target(removal, s.refs.equal!).cards[s.refs.equal!]!.zone).toBe('discard');
  expect(unitStats(step(removal, 'decline-effect'), removal.cards[s.refs.ally!]!).power).toBe(5);
});

test('Air Superiority compares both fleets; Resistance Blue Squadron counts itself', () => {
  for (const advantage of [false, true]) {
    const p = playCard('air-superiority');
    p.players[0].space = [{ card: 'x-wing' }];
    if (!advantage) p.players[1].space = [{ card: 'x-wing' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const s = scenario(p),
      choice = step(s.state, 'play');
    if (advantage) expect(target(choice, s.refs.enemy!).cards[s.refs.enemy!]!.damage).toBe(4);
    else expect(choice.cards[s.refs.enemy!]!.damage).toBe(0);
  }
  const p = playCard('resistance-blue-squadron');
  p.players[0].space = [{ card: 'x-wing' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const s = scenario(p);
  expect(target(step(s.state, 'play'), s.refs.enemy!).cards[s.refs.enemy!]!.damage).toBe(2);
});

test('Turbolaser Salvo uses a friendly space unit as the source of simultaneous damage in the selected arena', () => {
  const p = playCard('turbolaser-salvo');
  p.players[0].space = [{ card: 'x-wing', ref: 'gunner' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.players[1].space = [{ card: 'x-wing', ref: 'other' }];
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'one', ref: 'shield' + n }));
  const s = scenario(p),
    arena = step(s.state, 'play');
  const gunner = step(arena, i => i.kind === 'choose-mode' && i.mode === 'ground');
  const prevention = target(gunner, s.refs.gunner!);
  expect(prevention.cards[s.refs.two!]!.damage).toBe(0);
  resume(prevention, choose(prevention, 'target'));
  const after = target(prevention, s.refs.shield1!);
  expect(after.cards[s.refs.one!]!.damage).toBe(0);
  expect(after.cards[s.refs.two!]!.damage).toBe(2);
  expect(after.cards[s.refs.other!]!.damage).toBe(0);
  expect(after.facts.find(f => f.type === 'damage')!.cards[0]!.instanceId).toBe(s.refs.gunner!);
});

test('Far Far Away requires returning a friendly unit, and a returned token still permits the enemy return', () => {
  const p = playCard('far-far-away');
  p.players[0].ground = [{ card: 'spy', ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    enemy = target(step(s.state, 'play'), s.refs.friendly!);
  expect(enemy.cards[s.refs.friendly!]!.zone).toBe('set-aside');
  expect(target(enemy, s.refs.enemy!).cards[s.refs.enemy!]!.zone).toBe('hand');
  p.players[0].ground = [];
  const none = scenario(p);
  expect(step(none.state, 'play').cards[none.refs.enemy!]!.zone).toBe('ground');
});

test('Support reevaluates Yellow Aces, Gozanti and Doctor Pershing for their exact recipient', () => {
  const p = playCard('yellow-aces-bomber');
  p.players[0].ground = [{ card: ids.consular, ref: 'receiver' }];
  p.attachments = [{ card: 'experience', unit: 'receiver' }];
  const s = scenario(p),
    support = step(s.state, 'play');
  const damage = step(
    support,
    i => i.kind === 'attack' && i.defender === support.players.bob!.base,
  );
  expect(target(damage, damage.players.bob!.base).cards[damage.players.bob!.base]!.damage).toBe(6);
  p.players[0].hand = [{ card: 'gozanti-assault-carrier', ref: 'played' }];
  const t = scenario(p),
    g = step(t.state, 'play');
  const buff = step(g, 'attack');
  expect(effectiveAbilities(buff, buff.cards[t.refs.receiver!]!).keywords).toContain('Sentinel');
  expect(effectiveAbilities(nextRound(buff), buff.cards[t.refs.receiver!]!).keywords).not.toContain(
    'Sentinel',
  );
  p.players[0].hand = [{ card: 'doctor-pershing--dedicated-to-research', ref: 'played' }];
  for (const remaining of [2, 3]) {
    p.players[0].ground![0]!.damage = 8 - remaining;
    const u = scenario(p),
      choice = step(u.state, 'play');
    expect(step(choice, 'attack').players.alice!.hand).toHaveLength(remaining === 3 ? 1 : 0);
  }
});

test('Boba pays resources separately from playing, can decline, and cannot pay when all resources are exhausted', () => {
  const p = playCard('boba-fett--for-a-price');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const s = scenario(p),
    payment = step(s.state, 'play');
  const readyBefore = payment.players.alice!.resources.filter(
    id => !payment.cards[id]!.exhausted,
  ).length;
  resume(payment, choose(payment, 'accept-effect'));
  const after = target(step(payment, 'accept-effect'), s.refs.enemy!);
  expect(after.cards[s.refs.enemy!]!.damage).toBe(3);
  expect(after.players.alice!.resources.filter(id => !after.cards[id]!.exhausted)).toHaveLength(
    readyBefore - 1,
  );
  expect(step(payment, 'decline-effect').cards[s.refs.enemy!]!.damage).toBe(0);
  const q = position();
  q.players[0].ground = [{ card: 'boba-fett--for-a-price' }];
  const noResources = step(scenario(q).state, 'attack');
  expect(noResources.execution.decision!.kind).toBe('action');
  expect(noResources.execution.decision!.playerId).toBe('bob');
  p.players[0].ground = [{ card: 'boba-fett--for-a-price', ref: 'older' }];
  const duplicate = scenario(p),
    keep = step(duplicate.state, 'play');
  const pending = step(keep, i => i.kind === 'keep-unique' && i.card === duplicate.refs.older);
  expect(pending.cards[duplicate.refs.played!]!.zone).toBe('discard');
  resume(pending, choose(pending, 'accept-effect'));
  const paidAfterDeparture = target(step(pending, 'accept-effect'), duplicate.refs.enemy!);
  expect(paidAfterDeparture.cards[duplicate.refs.enemy!]!.damage).toBe(3);
});

test('Boba’s Rancor damages its own base first, repeats against the same incarnation, and scales attack damage by five', () => {
  const p = playCard('boba-fett-s-rancor--emotionally-complex-creature');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.cards[choice.players.alice!.base]!.damage).toBe(5);
  const after = target(choice, s.refs.enemy!);
  expect(after.cards[s.refs.enemy!]!.damage).toBe(5);
  const q = position();
  q.players[0].ground = [{ card: 'boba-fett-s-rancor--emotionally-complex-creature' }];
  q.players[0].base.damage = 14;
  const u = scenario(q),
    attack = step(u.state, 'attack');
  const end = target(attack, attack.players.alice!.base);
  expect(end.cards[end.players.alice!.base]!.damage).toBe(16);
});

test('Taking initiative triggers only its controller’s Grogu and Ziton, while the Mandalorian uses his current face', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'grogu--yes--yes--yes-', ref: 'grogu' },
    { card: ids.marine, ref: 'marine' },
    { card: 'ziton-moj--black-sun-bully', ref: 'ziton' },
  ];
  p.players[1].ground = [{ card: 'ziton-moj--black-sun-bully' }];
  const s = scenario(p),
    batch = step(s.state, 'take-initiative');
  resume(batch, choose(batch, 'trigger'));
  const attack = target(trigger(batch, 'on-initiative-taken'), s.refs.marine!);
  const endAttack = step(attack, 'attack');
  const done = target(endAttack, endAttack.players.bob!.base);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
  expect(done.initiative).toEqual({ holder: 'alice', claimed: true });
  expect(done.execution.decision!.playerId).toBe('bob');
  const q = position();
  q.players[0].resources = resources();
  q.players[0].leader = { card: 'the-mandalorian--we-can-t-keep-running', ref: 'leader' };
  const t = scenario(q),
    payment = step(t.state, 'take-initiative');
  expect(step(payment, 'accept-effect').players.alice!.hand).toHaveLength(1);
  expect(step(payment, 'decline-effect').players.alice!.hand).toHaveLength(0);
  q.players[0].leader.deployedAs = 'unit';
  const u = scenario(q);
  expect(step(u.state, 'take-initiative').players.alice!.hand).toHaveLength(0);
  const drawChoice = step(u.state, 'attack');
  const drawn = step(drawChoice, i => i.kind === 'choose-mode' && i.mode === 'draw');
  expect(drawn.players.alice!.hand).toHaveLength(1);
});

test('Attack history includes both players, allows the same unit again, and resets for the next phase', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'boonta-eve-flagbearer', ref: 'flag' },
    { card: 'canyon-frontrunner', ref: 'canyon' },
    { card: ids.consular, ref: 'other' },
  ];
  p.players[0].base.damage = 6;
  const s = scenario(p),
    choices = step(s.state, i => i.kind === 'attack' && i.attacker === s.refs.canyon);
  const reduced = target(trigger(choices, 'on-attack'), s.refs.other!);
  expect(reduced.cards[reduced.players.alice!.base]!.damage).toBe(4);
  const next = step(reduced, 'pass');
  const other = step(next, i => i.kind === 'attack' && i.attacker === s.refs.other);
  expect(other.cards[other.players.alice!.base]!.damage).toBe(4);
  expect(other.phaseHistory.attacks).toHaveLength(2);
  expect(nextRound(other).phaseHistory.attacks).toEqual([]);
  p.attackedThisPhase = ['canyon'];
  const repeat = scenario(p);
  const again = step(repeat.state, i => i.kind === 'attack' && i.attacker === repeat.refs.canyon);
  expect(
    target(trigger(again, 'on-attack'), repeat.refs.other!).cards[repeat.state.players.alice!.base]!
      .damage,
  ).toBe(4);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attackedThisPhase = ['enemy'];
  const enemyFirst = scenario(p);
  const disabled = trigger(
    step(enemyFirst.state, i => i.kind === 'attack' && i.attacker === enemyFirst.refs.canyon),
    'on-attack',
  );
  expect(disabled.execution.decision!.kind).toBe('action');
  expect(disabled.cards[disabled.players.alice!.base]!.damage).toBe(6);
  const invalid = structuredClone(choices);
  invalid.phaseHistory.attacks[0]!.instanceId = 'missing';
  expect(() => decodeState(encodeState(invalid))).toThrow();
});

test('Resupply Carrier resources the top card exhausted without showing its face to others or leaking a hidden handle', () => {
  const p = playCard('resupply-carrier'),
    s = scenario(p),
    choice = step(s.state, 'play');
  const top = choice.players.alice!.deck[0]!;
  resume(choice, choose(choice, 'accept-effect'));
  const after = step(choice, 'accept-effect');
  expect(after.cards[top]!.zone).toBe('resources');
  expect(after.cards[top]!.exhausted).toBe(true);
  const secret = structuredClone(choice);
  secret.cards[top]!.cardId = ids.fighter;
  const changed = step(secret, 'accept-effect');
  const key = 'c'.repeat(64);
  expect(new Projector(after.gameId, { role: 'spectator' }, key).project(after)).toEqual(
    new Projector(changed.gameId, { role: 'spectator' }, key).project(changed),
  );
  expect(step(choice, 'decline-effect').cards[top]!.zone).toBe('deck');
});

test('board-dependent keywords and attack grants switch according to their printed conditions', () => {
  const p = position();
  p.players[0].ground = [{ card: 'shin-hati--going-somewhere-', ref: 'shin' }];
  p.players[0].space = [
    { card: 'b-wing-rearguard', ref: 'bwing' },
    { card: 'first-order-tie-fighter', ref: 'fighter' },
    { card: 'black-one--straight-at-them', ref: 'black' },
  ];
  const s = scenario(p);
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.shin!]!).keywords).toContain('Sentinel');
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.bwing!]!).keywords).toContain('Sentinel');
  expect(effectiveAbilities(s.state, s.state.cards[s.refs.fighter!]!).raid).toBe(0);
  p.players[0].ground!.push({ card: 'spy' });
  p.attachments = [{ card: 'shield', unit: 'black' }];
  const t = scenario(p);
  expect(effectiveAbilities(t.state, t.state.cards[t.refs.shin!]!).keywords).not.toContain(
    'Sentinel',
  );
  expect(effectiveAbilities(t.state, t.state.cards[t.refs.fighter!]!).raid).toBe(1);
  expect(unitStats(t.state, t.state.cards[t.refs.black!]!).power).toBe(
    unitStats(s.state, s.state.cards[s.refs.black!]!).power + 1,
  );
  expect(
    conditionMatches(
      t.state,
      'alice',
      { kind: 'controls-name', name: 'Sabine Wren' },
      { source: t.state.cards[t.refs.black!]! },
    ),
  ).toBe(true);
  expect(
    conditionMatches(
      t.state,
      'alice',
      { kind: 'controls-name', name: 'Poe Dameron' },
      { source: t.state.cards[t.refs.black!]! },
    ),
  ).toBe(false);
});

test('Obi-Wan grants himself Sentinel after a friendly Force unit is played, while Danger Squadron cannot grant itself Advantage', () => {
  const p = playCard('ezra-bridger--attuned-with-life');
  p.players[0].ground = [{ card: 'obi-wan-kenobi--protective-padawan', ref: 'obi' }];
  const s = scenario(p),
    after = step(s.state, 'play');
  expect(effectiveAbilities(after, after.cards[s.refs.obi!]!).keywords).toContain('Sentinel');
  expect(effectiveAbilities(nextRound(after), after.cards[s.refs.obi!]!).keywords).not.toContain(
    'Sentinel',
  );
  const q = position();
  q.players[0].space = [{ card: 'danger-squadron-wingmen', ref: 'source' }];
  q.players[1].ground = [{ card: ids.marine, ref: 'target' }];
  const t = scenario(q),
    choice = step(t.state, 'attack');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: t.refs.target! },
    { kind: 'decline-effect' },
  ]);
  expect(upgrades(target(choice, t.refs.target!), t.refs.target!)).toEqual(['advantage']);
  const r = scenario(playCard('tantive-iv--fleeing-the-empire'));
  expect(
    Object.values(step(r.state, 'play').cards).filter(
      c => c.cardId === 'x-wing' && c.zone === 'space',
    ),
  ).toHaveLength(1);
});

test('Corona Four reduces power on attack and its defeat trigger can remove only a zero-power non-leader unit', () => {
  const p = position();
  p.players[0].space = [{ card: 'corona-four--justice-for-alderaan', ref: 'corona' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const s = scenario(p),
    attack = step(s.state, 'attack');
  expect(unitStats(target(attack, s.refs.enemy!), s.state.cards[s.refs.enemy!]!).power).toBe(1);
  const q = playCard('direct-hit');
  q.players[0].space = p.players[0].space;
  q.players[1].ground = [
    { card: 'spy', ref: 'zero' },
    { card: ids.marine, ref: 'other' },
  ];
  q.players[1].leader.deployedAs = 'unit';
  const t = scenario(q),
    removal = target(step(t.state, 'play'), t.refs.corona!);
  expect(removal.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: t.refs.zero! },
    { kind: 'decline-effect' },
  ]);
  expect(target(removal, t.refs.zero!).cards[t.refs.zero!]!.zone).toBe('set-aside');
});
