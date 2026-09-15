import { expect, test } from 'bun:test';
import { attackTargets } from '../engine/actions.ts';
import { canAffectWithAbility } from '../engine/protection.ts';
import { survivesZeroHp } from '../engine/lasting.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { playCost } from '../engine/state.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const baseAttack = (s: GameState, attacker = s.players.alice!.leader) =>
  step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === s.players.bob!.base,
  );
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
const units = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && c.zone === 'ground' && !c.attachedTo);
function board(leader: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: leader, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = resources();
  p.players[0].base.damage = 5;
  return p;
}
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
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
function searchDone(s: GameState, id: string) {
  s = step(s, 'search', [id]);
  const r = s.execution.random!;
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(() => 0),
  }).state;
}
function pending(s: GameState) {
  while (s.execution.decision?.kind === 'trigger') s = step(s, 'trigger');
  return s;
}

for (const attackUnit of [false, true])
  test(`Anakin What It Takes pays two base damage before attacking with a bonus only against a unit (${attackUnit})`, () => {
    const p = board('anakin-skywalker--what-it-takes-to-win');
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = use(g.state);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(7);
    expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(true);
    const chosen = target(s, g.refs.attacker!);
    const input = choose(
      chosen,
      i => i.kind === 'attack' && i.defender === (attackUnit ? g.refs.enemy : s.players.bob!.base),
    );
    resume(chosen, input);
    const done = advance(chosen, input).state;
    expect(done.cards[attackUnit ? g.refs.enemy! : s.players.bob!.base]!.damage).toBe(
      attackUnit ? 5 : 3,
    );
  });
test('Anakin can pay lethal base damage, ending the game before his attack; his unit scales by full groups of five', () => {
  const p = board('anakin-skywalker--what-it-takes-to-win');
  p.players[0].base.damage = 29;
  const s = use(scenario(p).state);
  expect(s.result!.winner).toBe('bob');
  expect(s.facts.some(f => f.type === 'attacked')).toBe(false);
  for (const damage of [4, 5, 14, 15]) {
    const q = board('anakin-skywalker--what-it-takes-to-win', true);
    q.players[0].base.damage = damage;
    const state = scenario(q).state;
    expect(unitStats(state, state.cards[state.players.alice!.leader]!).power).toBe(
      4 + Math.floor(damage / 5),
    );
    expect(effectiveAbilities(state, state.cards[state.players.alice!.leader]!).keywords).toContain(
      'Overwhelm',
    );
  }
});
for (const leader of ['jyn-erso--resisting-oppression', 'grand-inquisitor--stories-travel-quickly'])
  test(`${leader} front weakens the defender for exactly the selected attack`, () => {
    const p = board(leader);
    p.players[0].force = true;
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    const choice = target(use(g.state), g.refs.attacker!);
    resume(
      choice,
      choose(choice, i => i.kind === 'attack' && i.defender === g.refs.enemy),
    );
    const s = step(choice, i => i.kind === 'attack' && i.defender === g.refs.enemy);
    expect(s.cards[g.refs.attacker!]!.damage).toBe(leader.startsWith('jyn') ? 2 : 1);
    expect(unitStats(s, s.cards[g.refs.enemy!]!).power).toBe(3);
    if (leader.startsWith('grand')) expect(forceToken(s, 'alice')).toBeUndefined();
  });
test('Jyn unit weakens the defender during any friendly attack and retains that imposed modifier when the defender loses abilities', () => {
  const p = board('jyn-erso--resisting-oppression', true);
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.attacker!]!, g.state.cards[g.refs.enemy!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  const s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.enemy,
  );
  expect(s.cards[g.refs.attacker!]!.damage).toBe(2);
  expect(unitStats(s, s.cards[g.refs.enemy!]!).power).toBe(3);
});
test('Grand Inquisitor deploys Shielded and applies his unit-side defender penalty', () => {
  const p = board('grand-inquisitor--stories-travel-quickly');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(attachedUpgrades(s, s.cards[s.players.alice!.leader]!).map(c => c.cardId)).toEqual([
    'shield',
  ]);
  s = step(s, 'pass');
  s = step(
    s,
    i =>
      i.kind === 'attack' && i.attacker === s.players.alice!.leader && i.defender === g.refs.enemy,
  );
  expect(s.cards[s.players.alice!.leader]!.damage).toBe(0);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
  expect(attachedUpgrades(s, s.cards[s.players.alice!.leader]!)).toHaveLength(0);
});
for (const attackUnit of [false, true])
  test(`Moff Gideon front only gives a small attacker its bonus against a unit (${attackUnit})`, () => {
    const p = board('moff-gideon--formidable-commander');
    p.players[0].ground = [
      { card: ids.marine, ref: 'small' },
      { card: ids.consular, ref: 'large' },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = use(g.state);
    expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
      { kind: 'target', card: g.refs.small! },
    ]);
    const done = step(
      target(s, g.refs.small!),
      i => i.kind === 'attack' && i.defender === (attackUnit ? g.refs.enemy : s.players.bob!.base),
    );
    expect(done.cards[attackUnit ? g.refs.enemy! : s.players.bob!.base]!.damage).toBe(
      attackUnit ? 4 : 3,
    );
  });
test('Moff Gideon unit grants small attackers Overwhelm and power only during attacks on units', () => {
  const p = board('moff-gideon--formidable-commander', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'small' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const g = scenario(p);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.small!]!).keywords).not.toContain(
    'Overwhelm',
  );
  const s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.small && i.defender === g.refs.enemy,
  );
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  const direct = baseAttack(g.state, g.refs.small!);
  expect(direct.cards[direct.players.bob!.base]!.damage).toBe(3);
});
test('Leia Alliance General front completes the first Rebel attack before offering a different ready Rebel', () => {
  const p = board('leia-organa--alliance-general');
  p.players[0].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
    { card: 'clone-trooper', ref: 'not-rebel' },
  ];
  const g = scenario(p);
  let s = baseAttack(target(use(g.state), g.refs.first!), g.refs.first!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: g.refs.second! }]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.second),
  );
  s = baseAttack(target(s, g.refs.second!), g.refs.second!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(6);
});
test('Leia unit can offer a second Rebel attack even when she was defeated by combat', () => {
  const p = board('leia-organa--alliance-general', true);
  p.players[0].leader.damage = 3;
  p.players[0].ground = [{ card: ids.marine, ref: 'other' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(
    g.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === g.state.players.alice!.leader &&
      i.defender === g.refs.enemy,
  );
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
  s = baseAttack(target(s, g.refs.other!), g.refs.other!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
});
test('Yularen front uses the first attacker’s printed cost for a strictly cheaper second unit after the first is defeated', () => {
  const p = board('colonel-yularen--this-is-why-we-plan');
  p.players[0].ground = [
    { card: ids.consular, damage: 4, ref: 'first' },
    { card: ids.marine, ref: 'cheap' },
    { card: ids.consular, ref: 'equal' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(use(g.state), g.refs.first!);
  s = step(s, i => i.kind === 'attack' && i.defender === g.refs.enemy);
  expect(s.cards[g.refs.first!]!.zone).toBe('discard');
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: g.refs.cheap! }]);
  s = baseAttack(target(s, g.refs.cheap!), g.refs.cheap!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
});
for (const survives of [false, true])
  test(`Yularen unit offers another small attack only if he survived (${survives})`, () => {
    const p = board('colonel-yularen--this-is-why-we-plan', true);
    p.players[0].leader.damage = survives ? 0 : 3;
    p.players[0].ground = [{ card: ids.consular, ref: 'other' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = step(
        g.state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.state.players.alice!.leader &&
          i.defender === g.refs.enemy,
      );
    if (survives) {
      expect(
        s.execution.decision!.options.some(
          o => o.intent.kind === 'target' && o.intent.card === g.refs.other,
        ),
      ).toBe(true);
      expect(step(s, 'decline-effect').execution.decision!.kind).toBe('action');
    } else expect(s.execution.decision!.kind).toBe('action');
  });
test('Saw front grants power and Overwhelm, then defeats the exact attacker after its complete trigger window', () => {
  const p = board('saw-gerrera--bring-down-the-empire');
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const g = scenario(p);
  const s = step(
    target(use(g.state), g.refs.attacker!),
    i => i.kind === 'attack' && i.defender === g.refs.enemy,
  );
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
  expect(s.cards[g.refs.attacker!]!.zone).toBe('discard');
});
for (const survives of [false, true])
  test(`Saw unit may sacrifice another attacker only after surviving his own attack (${survives})`, () => {
    const p = board('saw-gerrera--bring-down-the-empire', true);
    p.players[0].leader.damage = survives ? 0 : 4;
    p.players[0].ground = [{ card: ids.consular, ref: 'other' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.state.players.alice!.leader &&
        i.defender === g.refs.enemy,
    );
    if (survives) {
      s = baseAttack(target(s, g.refs.other!), g.refs.other!);
      expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
      expect(s.cards[g.refs.other!]!.zone).toBe('discard');
    } else {
      expect(s.execution.decision!.kind).toBe('action');
      expect(s.cards[g.refs.other!]!.zone).toBe('ground');
    }
  });
test('Chirrut front grants two HP for the phase to either player', () => {
  const p = board('chirrut--mwe--one-with-the-force');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(use(g.state), g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.enemy!]!).hp).toBe(9);
  s = step(step(s, 'pass'), 'pass');
  expect(unitStats(s, s.cards[g.refs.enemy!]!).hp).toBe(7);
});
test('Chirrut survives zero HP during action and prevents Overwhelm excess, then is defeated as regroup starts', () => {
  const p = board('chirrut--mwe--one-with-the-force', true);
  p.players[0].leader.damage = 5;
  p.players[1].leader = { card: 'savage-opress--you-must-have-your-revenge', deployedAs: 'unit' };
  p.activePlayer = 'bob';
  const g = scenario(p);
  let s = step(
    g.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === safelyBob(g.state) &&
      i.defender === g.state.players.alice!.leader,
  );
  expect(s.cards[s.players.alice!.leader]!.damage).toBe(11);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(5);
  expect(survivesZeroHp(s, s.cards[s.players.alice!.leader]!)).toBe(true);
  s = step(step(s, 'pass'), 'pass');
  expect(s.phase).toBe('regroup');
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(true);
});
function safelyBob(s: GameState) {
  return s.players.bob!.leader;
}
test('Blanking Chirrut removes his survival ability immediately', () => {
  const p = board('chirrut--mwe--one-with-the-force', true);
  p.players[0].leader.damage = 5;
  const s = scenario(p).state;
  const leader = s.cards[s.players.alice!.leader]!;
  expect(survivesZeroHp(s, leader)).toBe(true);
  s.execution.decision = null;
  s.execution.frames.unshift({
    kind: 'effect',
    playerId: 'alice',
    source: structuredClone(leader),
    effect: {
      kind: 'on-unit',
      target: 'source',
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
  });
  settle(s);
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
});
test('Cassian Climb front protects exact friendly base-damaging units even when blanked, but Sentinel overrides protection', () => {
  const p = board('cassian-andor--climb-');
  p.players[0].ground = [
    { card: ids.marine, ref: 'protected' },
    { card: ids.marine, ref: 'normal' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.dealtBaseDamageThisPhase = ['protected'];
  const g = scenario(p);
  let targets = attackTargets(g.state, g.state.cards[g.refs.attacker!]!);
  expect(targets).not.toContain(g.refs.protected!);
  expect(targets).toContain(g.refs.normal!);
  modifyUnit(g.state, g.state.cards[g.refs.attacker!]!, g.state.cards[g.refs.protected!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(attackTargets(g.state, g.state.cards[g.refs.attacker!]!)).not.toContain(g.refs.protected!);
  g.state.lastingEffects = [];
  modifyUnit(g.state, g.state.cards[g.refs.attacker!]!, g.state.cards[g.refs.protected!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    abilities: { keywords: ['Sentinel'] },
    duration: 'phase',
  });
  expect(attackTargets(g.state, g.state.cards[g.refs.attacker!]!)).toEqual([g.refs.protected!]);
});
test('Cassian Climb unit survives at zero HP and rejects enemy defeat only while holding initiative', () => {
  const p = board('cassian-andor--climb-', true);
  p.players[0].leader.damage = 10;
  p.activePlayer = 'bob';
  const g = scenario(p),
    leader = g.state.cards[g.state.players.alice!.leader]!;
  expect(survivesZeroHp(g.state, leader)).toBe(true);
  expect(
    canAffectWithAbility(g.state, leader, g.state.cards[g.state.players.bob!.leader], 'defeat'),
  ).toBe(false);
  expect(canAffectWithAbility(g.state, leader, leader, 'defeat')).toBe(true);
  const s = step(g.state, 'take-initiative');
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
});

function groguChoice(s: GameState) {
  for (let n = 0; n < 8; n++) {
    if (s.execution.decision?.kind === 'trigger') s = step(s, 'trigger');
    else if (s.execution.decision?.options.some(o => o.intent.kind === 'decline-effect'))
      s = step(s, 'decline-effect');
    else return s;
  }
  throw new Error('Grogu trigger did not settle');
}
test('Grogu has no Epic action, deploys for a qualifying play without spending resources, and can deploy again after defeat', () => {
  const p = board('grogu--charming-companion');
  p.players[0].resources = resources(24);
  p.players[0].hand = [
    { card: 'darth-vader--scourge-of-squadrons', ref: 'first' },
    { card: 'kanan-jarrus--spectre-one', ref: 'second' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  expect(g.state.execution.decision!.options.some(o => o.intent.kind === 'use-ability')).toBe(
    false,
  );
  let s = step(g.state, i => i.kind === 'play' && i.card === g.refs.first);
  resume(
    s,
    choose(s, i => i.kind === 'choose-mode' && i.mode === 'deploy-grogu'),
  );
  const paid = ready(s);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'deploy-grogu');
  expect(ready(s)).toBe(paid);
  expect(s.cards[s.players.alice!.leader]!.deployedAs).toBe('unit');
  s = step(
    s,
    i =>
      i.kind === 'attack' && i.attacker === g.refs.enemy && i.defender === s.players.alice!.leader,
  );
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(true);
  // Ready through regroup, then play the other qualifying unique unit.
  s = step(step(s, 'pass'), 'pass');
  while (s.phase === 'regroup') s = step(s, 'resource');
  s = groguChoice(step(s, i => i.kind === 'play' && i.card === g.refs.second));
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'deploy-grogu');
  expect(s.cards[s.players.alice!.leader]!.deployedAs).toBe('unit');
  expect(s.cards[s.players.alice!.leader]!.abilityUses).toEqual({});
});
for (const card of [ids.consular, 'poe-dameron--i-ll-come-back-for-you'])
  test(`Grogu does not deploy for an unqualified unit: ${card}`, () => {
    const p = board('grogu--charming-companion');
    p.players[0].hand = [{ card }];
    const s = step(scenario(p).state, 'play');
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  });
test('An exhausted Grogu cannot deploy from a unique play, and Piloting never satisfies his unit-play trigger', () => {
  for (const pilot of [false, true]) {
    const p = board('grogu--charming-companion');
    p.players[0].leader.exhausted = !pilot;
    p.players[0].hand = [{ card: 'darth-vader--scourge-of-squadrons' }];
    p.players[0].space = [{ card: ids.fighter }];
    const s = step(scenario(p).state, i => i.kind === 'play' && !!i.piloting === pilot);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  }
});
for (const defending of [false, true])
  test(`Grogu unit modifies combat involving another friendly unit (${defending ? 'defending' : 'attacking'})`, () => {
    const p = board('grogu--charming-companion', true);
    p.players[0].ground = [{ card: ids.consular, ref: 'own' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (defending) p.activePlayer = 'bob';
    const g = scenario(p),
      s = step(
        g.state,
        i =>
          i.kind === 'attack' &&
          i.attacker === (defending ? g.refs.enemy : g.refs.own) &&
          i.defender === (defending ? g.refs.own : g.refs.enemy),
      );
    expect(s.cards[g.refs.own!]!.damage).toBe(defending ? 3 : 2);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(defending ? 4 : 3);
  });
test('Grogu excludes his own attacks and defense from both combat modifiers', () => {
  const p = board('grogu--charming-companion', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.state.players.alice!.leader &&
        i.defender === g.refs.enemy,
    );
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
});
for (const crowded of [false, true])
  test(`Baylan front gives its bonus only to the sole friendly unit in its arena (${crowded})`, () => {
    const p = board('baylan-skoll--power-beyond-dream');
    p.players[0].ground = [
      { card: ids.marine, ref: 'chosen' },
      ...(crowded ? [{ card: ids.marine }] : []),
    ];
    p.players[1].ground = [{ card: ids.consular }];
    const g = scenario(p),
      s = target(use(g.state), g.refs.chosen!);
    expect(unitStats(s, s.cards[g.refs.chosen!]!)).toEqual(
      crowded ? { power: 3, hp: 3 } : { power: 5, hp: 5 },
    );
    expect(ready(s)).toBe(11);
  });
test('Baylan unit ignores friendly leaders when counting the sole nonleader, grants Sentinel, and never targets a leader', () => {
  const p = board('baylan-skoll--power-beyond-dream', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'chosen' }];
  const g = scenario(p),
    s = baseAttack(g.state);
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: g.refs.chosen! }]);
  const done = target(s, g.refs.chosen!);
  expect(unitStats(done, done.cards[g.refs.chosen!]!)).toEqual({ power: 5, hp: 5 });
  expect(effectiveAbilities(done, done.cards[g.refs.chosen!]!).keywords).toContain('Sentinel');
});
for (const equal of [false, true])
  test(`Thrawn Victory front grants Restore 2 for one attack only at equal unit counts (${equal})`, () => {
    const p = board('grand-admiral-thrawn--victory-is-mine');
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    if (equal) p.players[1].space = [{ card: ids.fighter }];
    const g = scenario(p),
      s = baseAttack(target(use(g.state), g.refs.attacker!), g.refs.attacker!);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(equal ? 3 : 5);
    expect(effectiveAbilities(s, s.cards[g.refs.attacker!]!).restore).toBe(0);
  });
for (const more of [false, true])
  test(`Thrawn Victory unit may defeat an enemy nonleader only with more units, and always restores (${more})`, () => {
    const p = board('grand-admiral-thrawn--victory-is-mine', true);
    if (more) p.players[0].space = [{ card: ids.fighter }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = pending(baseAttack(g.state));
    if (more) s = target(s, g.refs.enemy!);
    s = pending(s);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(more ? 'discard' : 'ground');
    expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
  });
test('Shin front pays optional exhaustion after an attack and uses actual combat base damage for a strict cost bound', () => {
  const p = board('shin-hati--eager-adversary');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].space = [
    { card: ids.fighter, ref: 'cheap' },
    { card: 'millennium-falcon--get-out-and-push', ref: 'equal' },
  ];
  const g = scenario(p);
  const ask = baseAttack(g.state, g.refs.attacker!);
  expect(ask.cards[ask.players.alice!.leader]!.exhausted).toBe(false);
  let s = step(ask, 'accept-effect');
  expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(true);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.equal,
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.cheap),
  );
  s = target(s, g.refs.cheap!);
  expect(s.cards[g.refs.cheap!]!.exhausted).toBe(true);
});
test('Shin unit can decline without consuming its limit, then exhaust once during that round', () => {
  const p = board('shin-hati--eager-adversary', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(baseAttack(g.state, g.refs.attacker!), 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = step(s, 'pass');
  s = step(baseAttack(s), 'accept-effect');
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
});
test('Asajj I Work Alone front retains a defeated friendly unit’s arena for its follow-up damage', () => {
  const p = board('asajj-ventress--i-work-alone');
  p.players[0].ground = [{ card: 'battle-droid', ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p);
  let s = target(use(g.state), g.refs.friendly!);
  expect(s.cards[g.refs.friendly!]!.zone).toBe('set-aside');
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.ground! },
  ]);
  resume(s, choose(s, 'target'));
  s = target(s, g.refs.ground!);
  expect(s.cards[g.refs.ground!]!.damage).toBe(1);
});
test('Asajj I Work Alone has only Grit as a unit, while her Pilot grants Grit and the attack damage ability', () => {
  const p = board('asajj-ventress--i-work-alone', true);
  p.players[0].leader.damage = 2;
  const s = scenario(p).state;
  expect(unitStats(s, s.cards[s.players.alice!.leader]!).power).toBe(6);
  expect(baseAttack(s).execution.decision!.kind).toBe('action');
  const q = board('asajj-ventress--i-work-alone');
  q.players[0].space = [{ card: ids.fighter, damage: 1, ref: 'host' }];
  q.players[0].leader.deployedAs = 'upgrade';
  q.players[0].leader.attachedTo = 'host';
  q.players[0].ground = [{ card: ids.consular, ref: 'friendly' }];
  q.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(q);
  expect(unitStats(g.state, g.state.cards[g.refs.host!]!).power).toBe(6);
  const done = target(target(baseAttack(g.state, g.refs.host!), g.refs.friendly!), g.refs.enemy!);
  expect(done.cards[g.refs.friendly!]!.damage).toBe(1);
  expect(done.cards[g.refs.enemy!]!.damage).toBe(1);
});
for (const deployed of [false, true])
  test(`Holdo ${deployed ? 'unit' : 'front'} buffs a Resistance unit or any unit with a Resistance upgrade, including enemies`, () => {
    const p = board('admiral-holdo--we-re-not-alone', deployed);
    p.players[0].space = [{ card: 'resistance-blue-squadron', ref: 'own' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'host' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'other' }];
    p.attachments = [{ card: 'paige-tico--dropping-the-hammer', unit: 'host' }];
    const g = scenario(p),
      s = deployed ? baseAttack(g.state) : use(g.state);
    expect(
      s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
    ).toEqual([
      { kind: 'target', card: g.refs.own! },
      { kind: 'target', card: g.refs.host! },
    ]);
    const prior = unitStats(g.state, g.state.cards[g.refs.host!]!);
    const done = target(s, g.refs.host!);
    expect(unitStats(done, done.cards[g.refs.host!]!)).toEqual({
      power: prior.power + 2,
      hp: prior.hp + 2,
    });
  });
for (const deployed of [false, true])
  test(`Ackbar ${deployed ? 'unit' : 'front'} has the exhausted unit’s controller create its X-Wing (${deployed})`, () => {
    const p = board('admiral-ackbar--it-s-a-trap-', deployed);
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      s = deployed ? baseAttack(g.state) : use(g.state);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
    );
    const done = target(s, g.refs.enemy!);
    const wings = Object.values(done.cards).filter(
      c => c.cardId === 'x-wing' && c.zone === 'space',
    );
    expect(wings).toHaveLength(1);
    expect(wings[0]!.controller).toBe('bob');
    expect(wings[0]!.owner).toBe('bob');
    expect(wings[0]!.exhausted).toBe(true);
    expect(done.cards[g.refs.enemy!]!.exhausted).toBe(true);
  });
for (const deployed of [false, true])
  test(`Ackbar does not create an X-Wing after choosing an already exhausted unit (${deployed})`, () => {
    const p = board('admiral-ackbar--it-s-a-trap-', deployed);
    p.players[1].ground = [{ card: ids.consular, exhausted: true, ref: 'enemy' }];
    const g = scenario(p),
      s = target(deployed ? baseAttack(g.state) : use(g.state), g.refs.enemy!);
    expect(Object.values(s.cards).some(c => c.cardId === 'x-wing')).toBe(false);
  });

test('Chirrut at zero HP recovers before crossing into regroup and still dies before regroup choices', () => {
  const p = board('chirrut--mwe--one-with-the-force', true);
  p.players[0].leader.damage = 8;
  let s = scenario(p).state;
  s = step(s, 'pass');
  resume(s, choose(s, 'pass'));
  s = step(s, 'pass');
  expect(s.cards[s.players.alice!.leader]!.zone).toBe('base');
  expect(s.phase).toBe('regroup');
});
test('Saw waits for a surviving Attack Ends return to hand and cannot defeat the departed incarnation afterward', () => {
  const p = board('saw-gerrera--bring-down-the-empire');
  p.players[0].ground = [
    { card: ids.consular, ref: 'attacker' },
    { card: 'anakin-skywalker--prescient-podracer' },
  ];
  const g = scenario(p);
  let s = baseAttack(target(use(g.state), g.refs.attacker!), g.refs.attacker!);
  resume(
    s,
    choose(s, i => i.kind === 'choose-mode' && i.mode === 'return-attacker'),
  );
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'return-attacker');
  expect(s.cards[g.refs.attacker!]!.zone).toBe('hand');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
});
test('Ackbar front excludes deployed leaders while his unit may exhaust an enemy leader', () => {
  for (const deployed of [false, true]) {
    const p = board('admiral-ackbar--it-s-a-trap-', deployed);
    p.players[1].leader.deployedAs = 'unit';
    const g = scenario(p),
      s = deployed ? baseAttack(g.state) : use(g.state);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.players.bob!.leader,
      ),
    ).toBe(deployed);
    if (deployed) {
      const done = target(s, s.players.bob!.leader);
      expect(
        Object.values(done.cards).filter(c => c.cardId === 'x-wing' && c.zone === 'space'),
      ).toHaveLength(1);
    }
  }
});

test('Granted survival works on an ordinary unit, persists through recovery and is removed by ability loss', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'recipient' }];
  const g = scenario(p),
    s = g.state,
    recipient = s.cards[g.refs.recipient!]!;
  modifyUnit(s, s.cards[s.players.alice!.leader]!, recipient, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { surviveZeroHp: true },
  });
  s.execution.decision = null;
  s.execution.frames.unshift({
    kind: 'effect',
    source: structuredClone(recipient),
    playerId: 'alice',
    effect: { kind: 'on-unit', target: 'source', operation: { kind: 'damage', amount: 3 } },
  });
  settle(s);
  expect(s.cards[recipient.instanceId]!.zone).toBe('ground');
  expect(s.cards[recipient.instanceId]!.damage).toBe(3);
  resume(s, choose(s, 'pass'));
  s.execution.decision = null;
  s.execution.frames.unshift({
    kind: 'effect',
    source: structuredClone(recipient),
    playerId: 'alice',
    effect: {
      kind: 'on-unit',
      target: 'source',
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        loseAbilities: true,
      },
    },
  });
  settle(s);
  expect(s.cards[recipient.instanceId]!.zone).toBe('discard');
});
