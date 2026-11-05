import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectFrames } from '../engine/triggers.ts';
import { reference } from '../engine/state.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { choose, ids, position } from './helpers.ts';
import { ordered } from './ic27-helpers.ts';
import { scenario } from './scenario.ts';

const asajj = 'asajj-ventress--death-from-above';
const dooku = 'count-dooku--silver-tongued';
const greedo = 'greedo--big-timer';
const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  state: GameState,
  intent: Intent['kind'] | ((intent: Intent) => boolean),
  selections: string[] = [],
) => advance(decodeState(encodeState(state)), choose(state, intent, selections)).state;
function resume(state: GameState, input: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(state, input));
}
function swapPosition(asajjInHand = true) {
  const input = position('ic27-swap');
  input.players[0].leader = { card: 'asajj-ventress--bald-and-beautiful' };
  input.players[0].hand = [{ card: asajjInHand ? asajj : ids.marine, ref: 'asajj' }];
  if (!asajjInHand) input.players[0].deck![0]!.card = asajj;
  input.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  input.players[0].resources = resources(5);
  input.attachments = [
    { card: 'academy-training', unit: 'attacker', ref: 'upgrade' },
    { card: 'experience', unit: 'attacker', ref: 'xp' },
  ];
  return scenario(input);
}
const attackBase = (s: GameState, attacker: string) =>
  step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === s.players.bob!.base,
  );

test('IC27 Asajj replaces the exact attacker before base damage; v8 6.3, 7.7.5, 8.5', () => {
  const game = swapPosition();
  let state = attackBase(game.state, game.refs.attacker!);
  expect(state.execution.frames[0]!.kind).toBe('combat-replacement');
  expect(state.cards[state.players.bob!.base]!.damage).toBe(0);
  resume(
    state,
    choose(state, i => i.kind === 'target' && i.card === game.refs.asajj),
  );
  state = step(state, i => i.kind === 'target' && i.card === game.refs.asajj);
  // Existing resource-payment continuation remains serializable.
  if (state.execution.decision?.options.some(o => o.intent.kind === 'accept-effect'))
    state = step(state, 'accept-effect');
  expect(state.cards[state.players.bob!.base]!.damage).toBe(5);
  expect(state.cards[game.refs.attacker!]!.zone).toBe('hand');
  expect(state.cards[game.refs.asajj!]!.zone).toBe('ground');
  expect(state.cards[game.refs.asajj!]!.exhausted).toBe(true);
  expect(state.players.alice!.resources.every(id => state.cards[id]!.exhausted)).toBe(true);
  expect(state.facts.filter(f => f.type === 'attacked')).toHaveLength(1);
  expect(state.phaseHistory.played).toHaveLength(0);
  expect(state.cards[game.refs.upgrade!]!.zone).toBe('discard');
  expect(state.cards[game.refs.xp!]!.zone).toBe('set-aside');
  expect(attachedUpgrades(state, state.cards[game.refs.asajj!]!)).toHaveLength(0);
  expect(state.attacks).toHaveLength(0);
});

test('Asajj can be declined; insufficient payment and unit defenders offer no replacement', () => {
  const game = swapPosition();
  let state = step(attackBase(game.state, game.refs.attacker!), 'decline-effect');
  expect(state.cards[state.players.bob!.base]!.damage).toBe(6);
  expect(state.cards[game.refs.asajj!]!.zone).toBe('hand');
  const low = swapPosition();
  low.state.cards[low.state.players.alice!.resources[0]!]!.exhausted = true;
  state = attackBase(low.state, low.refs.attacker!);
  expect(state.execution.decision!.options.map(o => o.intent.kind)).toEqual(['decline-effect']);
  state = step(state, 'decline-effect');
  expect(state.cards[state.players.bob!.base]!.damage).toBe(6);
  expect(state.execution.frames[0]!.kind).toBe('action');
  const input = position();
  input.players[0].hand = [{ card: asajj }];
  input.players[0].resources = resources();
  input.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  input.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const units = scenario(input);
  state = step(
    units.state,
    i =>
      i.kind === 'attack' &&
      i.attacker === units.refs.attacker &&
      i.defender === units.refs.defender,
  );
  expect(state.execution.frames[0]!.kind).toBe('action');
  expect(state.cards[units.refs.defender!]!.damage).toBe(3);
});

test('Asajj does not inherit bonuses or upgrade attachments from the original attacker', () => {
  const game = swapPosition();
  modifyUnit(
    game.state,
    game.state.cards[game.refs.attacker!]!,
    game.state.cards[game.refs.attacker!]!,
    { kind: 'modify', power: 7, hp: 0, duration: 'phase' },
  );
  let state = attackBase(game.state, game.refs.attacker!);
  state = step(state, 'target');
  if (state.execution.frames[0]?.kind === 'effect') state = step(state, 'accept-effect');
  expect(state.cards[state.players.bob!.base]!.damage).toBe(5);
  expect(unitStats(state, state.cards[game.refs.asajj!]!).power).toBe(5);
});

test('Greedo deals combat damage last while attacking and defending; v8 6.3.5c', () => {
  for (const attacking of [true, false]) {
    const input = position(`greedo-${attacking}`);
    input.players[0].ground = [{ card: attacking ? greedo : ids.marine, ref: 'attacker' }];
    input.players[1].ground = [{ card: attacking ? ids.marine : greedo, ref: 'defender' }];
    const game = scenario(input);
    const state = step(
      game.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === game.refs.attacker &&
        i.defender === game.refs.defender,
    );
    expect(state.cards[game.refs[attacking ? 'attacker' : 'defender']!]!.zone).toBe('discard');
    expect(state.cards[game.refs[attacking ? 'defender' : 'attacker']!]!.damage).toBe(0);
  }
});

test('Dooku lets the opponent choose one exhausted unit per arena before simultaneous regroup readying', () => {
  const input = position('ic27-regroup');
  input.players[0].ground = [{ card: dooku, ref: 'dooku', exhausted: true }];
  input.players[1].ground = [
    { card: ids.marine, ref: 'a', exhausted: true },
    { card: ids.marine, ref: 'b', exhausted: true },
  ];
  input.players[1].space = [
    { card: ids.fighter, ref: 'c', exhausted: true },
    { card: ids.fighter, ref: 'd', exhausted: true },
  ];
  const game = scenario(input);
  let state = step(step(game.state, 'pass'), 'pass');
  state = step(step(state, 'resource'), 'resource');
  expect(state.execution.decision!.playerId).toBe('bob');
  expect(state.execution.decision!.selection!.cards).toEqual([game.refs.a!, game.refs.b!]);
  resume(state, choose(state, 'accept-effect', [game.refs.b!]));
  state = step(state, 'accept-effect', [game.refs.b!]);
  expect(state.cards[game.refs.b!]!.exhausted).toBe(true);
  resume(state, choose(state, 'accept-effect', [game.refs.c!]));
  state = step(state, 'accept-effect', [game.refs.c!]);
  expect(state.round).toBe(2);
  expect(['a', 'd'].every(ref => state.cards[game.refs[ref]!]!.exhausted)).toBe(true);
  expect(['b', 'c', 'dooku'].every(ref => !state.cards[game.refs[ref]!]!.exhausted)).toBe(true);
});

test('Holdo adds to the normal regroup draw, and Maz observes each resource including regroup', () => {
  const input = position('ic27-draw-resource');
  input.players[0].ground = [
    { card: 'admiral-holdo--we-are-the-spark', ref: 'holdo' },
    { card: 'maz-kanata--it-calls-to-you', ref: 'maz' },
  ];
  const game = scenario(input);
  let state = step(step(game.state, 'pass'), 'pass');
  expect(state.players.alice!.hand).toHaveLength(3);
  expect(state.players.bob!.hand).toHaveLength(2);
  state = step(state, 'resource', [state.players.alice!.hand[0]!]);
  // Maz's trigger is resolved at the resourcing window.
  if (state.execution.decision?.options.some(o => o.intent.kind === 'resource'))
    state = step(state, 'resource');
  expect(attachedUpgrades(state, state.cards[game.refs.maz!]!).map(c => c.cardId)).toEqual([
    'experience',
  ]);
});

test('Yoda prevents combat damage in both directions, but allows ability damage; v8 7.7.5', () => {
  const input = position('ic27-yoda');
  input.players[0].ground = [
    { card: 'yoda--a-disturbing-puzzle', ref: 'yoda' },
    { card: ids.marine, ref: 'other' },
  ];
  input.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const game = scenario(input);
  let state = attackBase(game.state, game.refs.yoda!);
  state = step(state, i => i.kind === 'target' && i.card === game.refs.target);
  state = step(state, 'pass');
  state = step(
    state,
    i => i.kind === 'attack' && i.attacker === game.refs.other && i.defender === game.refs.target,
  );
  expect(state.cards[game.refs.other!]!.damage).toBe(0);
  expect(state.cards[game.refs.target!]!.damage).toBe(0);
  state.execution.decision = null;
  state.execution.frames.unshift(
    ...effectFrames(
      'alice',
      state.cards[game.refs.yoda!]!,
      [{ kind: 'damage-target', target: 'target', amount: 2 }],
      { bindings: { target: reference(state.cards[game.refs.target!]!) } },
    ),
  );
  settle(state);
  expect(state.cards[game.refs.target!]!.damage).toBe(2);
});

test('Asajj includes missing aspect penalties and can finish payment with a Credit after recovery', () => {
  const input = position('ic27-asajj-credit');
  input.players[0].hand = [
    { card: asajj, ref: 'chosen' },
    { card: asajj, ref: 'other' },
  ];
  input.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  input.players[0].resources = resources(8); // Neither Cunning nor Villainy: 5 + 4.
  input.players[0].credits = ['credit'];
  const g = scenario(input);
  let s = attackBase(g.state, g.refs.attacker!);
  s = step(s, i => i.kind === 'target' && i.card === g.refs.chosen);
  if (s.execution.frames[0]!.kind === 'effect') s = step(s, 'accept-effect');
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  resume(s, choose(s, 'accept-effect', [g.refs.credit!]));
  s = step(s, 'accept-effect', [g.refs.credit!]);
  expect(s.cards[g.refs.chosen!]!.zone).toBe('ground');
  expect(s.cards[g.refs.other!]!.zone).toBe('hand');
  expect(s.cards[g.refs.credit!]!.zone).toBe('set-aside');
  expect(s.players.alice!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
});

test('Asajj’s private replacement choice never projects the unrevealed hand to other viewers', () => {
  const g = swapPosition();
  const h = swapPosition(false);
  const s = attackBase(g.state, g.refs.attacker!);
  const other = attackBase(h.state, h.refs.attacker!);
  for (const viewer of [{ role: 'player', playerId: 'bob' }, { role: 'spectator' }] as const) {
    const project = (state: GameState) =>
      new Projector(state.gameId, viewer, 'same-secret'.repeat(4)).project(state);
    expect(project(s)).toEqual(project(other));
    expect(other.execution.decision!.options.map(o => o.intent.kind)).toEqual(['decline-effect']);
    expect(project(s).decision).toBeNull();
    expect(JSON.stringify(project(s))).not.toContain(asajj);
  }
  const own = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(own.decision!.presentation!.title).toBe('Replace the attacker');
  expect(own.decision!.options).toHaveLength(2);
});

test('Asajj cannot replace a deployed leader or a space attacker', () => {
  for (const leader of [true, false]) {
    const input = position(`ic27-asajj-invalid-${leader}`);
    input.players[0].leader = {
      card: 'asajj-ventress--bald-and-beautiful',
      ref: 'leader',
      ...(leader ? { deployedAs: 'unit' as const } : {}),
    };
    input.players[0].hand = [{ card: asajj }];
    input.players[0].resources = resources();
    input.players[0].space = [{ card: ids.fighter, ref: 'fighter' }];
    const g = scenario(input);
    let s = ordered(attackBase(g.state, g.refs[leader ? 'leader' : 'fighter']!));
    if (leader && s.execution.frames[0]!.kind === 'effect') s = step(s, 'accept-effect', []);
    expect(s.execution.frames[0]!.kind).toBe('action');
    expect(s.phaseHistory.played).toHaveLength(0);
  }
});

test('Dooku counts a unit readied by a defeated trigger before the regroup ready step', () => {
  const input = position('dooku-regroup-trigger');
  input.players[0].ground = [{ card: dooku }];
  input.players[1].ground = [
    { card: 'eighth-brother--ill-fated-escape', ref: 'brother' },
    { card: ids.trooper, ref: 'first', exhausted: true },
    { card: ids.trooper, ref: 'second', exhausted: true },
  ];
  input.players[1].discard = [{ card: 'sneak-attack', ref: 'sneak' }];
  input.delayed = [{ source: 'sneak', unit: 'brother' }];
  const g = scenario(input);
  let s = ordered(step(step(g.state, 'pass'), 'pass'));
  s = step(s, i => i.kind === 'target' && i.card === g.refs.first);
  expect(s.cards[g.refs.first!]!.exhausted).toBe(false);
  expect(s.phaseHistory.regroupReadied).toHaveLength(1);
  s = step(step(s, 'resource'), 'resource');
  expect(s.round).toBe(2);
  expect(s.cards[g.refs.second!]!.exhausted).toBe(true);
});

test('Dooku requires a choice for simultaneous ability readying during regroup and preserves it across recovery', () => {
  const input = position('dooku-regroup-bulk');
  input.players[0].ground = [{ card: dooku }];
  input.players[1].ground = [
    { card: ids.marine, ref: 'a', exhausted: true },
    { card: ids.marine, ref: 'b', exhausted: true },
  ];
  const g = scenario(input);
  let s = step(step(g.state, 'pass'), 'pass');
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...effectFrames('bob', s.cards[s.players.bob!.leader]!, [
      { kind: 'ready-units', filter: { controller: 'friendly' } },
    ]),
  );
  settle(s);
  expect(s.execution.frames[0]!.kind).toBe('regroup-ready');
  resume(s, choose(s, 'accept-effect', [g.refs.b!]));
  s = step(s, 'accept-effect', [g.refs.b!]);
  expect(s.cards[g.refs.a!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.b!]!.exhausted).toBe(false);
  s = step(step(s, 'resource'), 'resource');
  expect(s.cards[g.refs.a!]!.exhausted).toBe(true);
});

test('Greedo’s controller chooses between conflicting first and last combat damage abilities', () => {
  for (const mode of ['attacker-first', 'defender-first']) {
    const input = position(`greedo-conflict-${mode}`);
    input.players[0].ground = [{ card: greedo, ref: 'greedo' }];
    input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(input),
      unit = g.state.cards[g.refs.greedo!]!;
    modifyUnit(g.state, unit, unit, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      abilities: { firstCombatDamage: true },
    });
    let s = step(
      g.state,
      i => i.kind === 'attack' && i.attacker === g.refs.greedo && i.defender === g.refs.enemy,
    );
    expect(s.execution.frames[0]!.kind).toBe('combat-order');
    resume(
      s,
      choose(s, i => i.kind === 'choose-mode' && i.mode === mode),
    );
    s = step(s, i => i.kind === 'choose-mode' && i.mode === mode);
    expect(s.cards[g.refs.greedo!]!.zone).toBe(mode === 'attacker-first' ? 'ground' : 'discard');
    expect(s.cards[g.refs.enemy!]!.zone).toBe(mode === 'attacker-first' ? 'discard' : 'ground');
  }
});

test('Dooku charges an ability ready to the player resolving it even when the target belongs to the opponent', () => {
  const input = position('dooku-cross-controller');
  input.players[0].ground = [{ card: dooku }, { card: ids.trooper, ref: 'enemy', exhausted: true }];
  input.players[1].ground = [
    { card: 'eighth-brother--ill-fated-escape', ref: 'brother' },
    { card: ids.trooper, ref: 'own', exhausted: true },
  ];
  input.players[1].discard = [{ card: 'sneak-attack', ref: 'sneak' }];
  input.delayed = [{ source: 'sneak', unit: 'brother' }];
  const g = scenario(input);
  let s = ordered(step(step(g.state, 'pass'), 'pass'));
  s = step(s, i => i.kind === 'target' && i.card === g.refs.enemy);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(false);
  expect(s.phaseHistory.regroupReadied!.map(r => r.playerId)).toEqual(['bob']);
  s = step(step(s, 'resource'), 'resource');
  expect(s.round).toBe(2);
  expect(s.cards[g.refs.own!]!.exhausted).toBe(true);
});

test('Asajj leader checks the surviving replacement attacker before readying a resource', () => {
  const g = swapPosition();
  const leader = g.state.players.alice!.leader;
  let s = step(
    g.state,
    i => i.kind === 'use-ability' && i.card === leader && i.abilityId === 'action',
  );
  s = step(s, i => i.kind === 'target' && i.card === g.refs.attacker);
  s = attackBase(s, g.refs.attacker!);
  s = step(s, i => i.kind === 'target' && i.card === g.refs.asajj);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.attacker!]!.zone).toBe('hand');
  expect(s.cards[g.refs.asajj!]!.zone).toBe('ground');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  const resource = s.players.alice!.resources[0]!;
  expect(s.cards[resource]!.exhausted).toBe(true);
  resume(s, choose(s, 'accept-effect', [resource]));
  s = step(s, 'accept-effect', [resource]);
  expect(s.cards[resource]!.exhausted).toBe(false);
});

test('Asajj replaces a token attacker by putting the token aside rather than adding it to hand', () => {
  const input = position('asajj-token');
  input.players[0].leader = { card: 'asajj-ventress--bald-and-beautiful' };
  input.players[0].hand = [{ card: asajj, ref: 'asajj' }];
  input.players[0].ground = [{ card: 'battle-droid', ref: 'token' }];
  input.players[0].resources = resources(5);
  const g = scenario(input);
  let s = step(attackBase(g.state, g.refs.token!), 'target');
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.token!]!.zone).toBe('set-aside');
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  expect(s.facts.filter(f => f.type === 'returned-to-hand')).toHaveLength(0);
  expect(s.facts.some(f => f.type === 'left-play')).toBe(true);
});
