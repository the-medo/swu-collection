import { LocalGame, replay } from '../host/session.ts';
import { expect, test } from 'bun:test';
import { advance, createGame, settle } from '../engine/advance.ts';
import { actionIntents, attackTargets, frameIntents } from '../engine/actions.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { instance, move, reference } from '../engine/state.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

const commando = 'imperial-armored-commando',
  constable = 'outer-rim-constable';
function step(state: GameState, intent: Intent['kind'] | ((intent: Intent) => boolean)) {
  return advance(state, choose(state, intent)).state;
}
function target(state: GameState, card: string) {
  return step(state, i => i.kind === 'target' && i.card === card);
}
function freshResume(state: GameState, input: unknown) {
  const result = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout.toString()).state;
}

test('v8 §§3.6, 6.2: upgrades need a unit before payment and may attach to an enemy without changing controller', () => {
  const fixture = position();
  fixture.players[0].hand = [{ card: 'academy-training', ref: 'training' }];
  fixture.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.marine }));
  let { state } = scenario(fixture);
  expect(actionIntents(state).filter(i => i.kind === 'play')).toEqual([]);
  fixture.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const built = scenario(fixture);
  state = built.state;
  const { refs } = built;
  state = step(state, i => i.kind === 'play' && i.target === refs.enemy);
  const upgrade = instance(state, refs.training!);
  expect(upgrade.attachedTo?.instanceId).toBe(refs.enemy);
  expect(upgrade.controller).toBe('alice');
  expect(unitStats(state, instance(state, refs.enemy!))).toEqual({ power: 5, hp: 5 });
  expect(state.players.alice!.resources.every(id => instance(state, id).exhausted)).toBe(true);
  expect(
    actionIntents(state)
      .filter(i => i.kind === 'attack')
      .every(i => i.attacker !== refs.training && i.defender !== refs.training),
  ).toBe(true);
  expect(decodeState(encodeState(state))).toEqual(state);
  const input = config();
  input.players[0].deck = [{ cardId: 'academy-training', quantity: 6 }];
  expect(() => createGame(input)).not.toThrow();
  input.players[0].deck = [{ cardId: 'shield', quantity: 6 }];
  expect(() => createGame(input)).toThrow('Unsupported');
});

test('v8 §7.5.12: playing the Commando creates one separate Shield and Sentinel restricts only its arena', () => {
  const fixture = position();
  fixture.players[0].hand = [{ card: commando, ref: 'commando' }];
  fixture.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  fixture.players[0].ground = [{ card: ids.marine, ref: 'friend' }];
  fixture.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
  fixture.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const { refs, state: initial } = scenario(fixture);
  let state = step(initial, 'play');
  const unit = instance(state, refs.commando!);
  const shields = attachedUpgrades(state, unit);
  expect(shields.map(c => c.cardId)).toEqual(['shield']);
  expect(shields[0]!.owner).toBe('alice');
  expect(state.facts.filter(f => f.type === 'played')).toHaveLength(1);
  expect(attackTargets(state, instance(state, refs.attacker!))).toEqual([refs.commando!]);
  expect(attackTargets(state, instance(state, refs.space!))).toContain(state.players.alice!.base);
  state = step(state, i => i.kind === 'attack' && i.attacker === refs.attacker);
  expect(instance(state, refs.commando!).damage).toBe(0);
  expect(instance(state, refs.attacker!).zone).toBe('discard');
  expect(instance(state, shields[0]!.instanceId).zone).toBe('set-aside');
  expect(state.players.alice!.discard).not.toContain(shields[0]!.instanceId);
  expect(state.facts.filter(f => f.type === 'damage-prevented').map(f => f.amount)).toEqual([3]);
});

test('v8 §§3.7.6, 7.7.5: both players choose physical Shields before simultaneous combat resolves; each choice recovers', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  fixture.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  fixture.attachments = ['attacker', 'defender'].flatMap(unit =>
    [1, 2].map(n => ({ card: 'shield', unit, ref: `${unit}${n}` })),
  );
  const { refs, state: initial } = scenario(fixture);
  let state = step(initial, i => i.kind === 'attack' && i.defender === refs.defender);
  expect(state.execution.decision?.kind).toBe('replacement');
  expect(state.execution.decision?.playerId).toBe('bob');
  expect(instance(state, refs.attacker!).damage).toBe(0);
  const input = choose(state, i => i.kind === 'target' && i.card === refs.defender2);
  const expected = advance(state, input).state;
  expect(freshResume(state, input)).toEqual(expected);
  state = expected;
  expect(state.execution.decision?.playerId).toBe('alice');
  // First replacement is reserved, not partially committed ahead of return damage.
  expect(instance(state, refs.defender2!).zone).toBe('ground');
  const next = choose(state, i => i.kind === 'target' && i.card === refs.attacker1);
  expect(freshResume(state, next)).toEqual(advance(state, next).state);
  state = advance(state, next).state;
  expect([refs.defender2, refs.attacker1].map(id => instance(state, id!).zone)).toEqual([
    'set-aside',
    'set-aside',
  ]);
  expect([refs.defender1, refs.attacker2].map(id => instance(state, id!).zone)).toEqual([
    'ground',
    'ground',
  ]);
  expect(state.facts.filter(f => f.type === 'damage')).toEqual([]);
  expect(state.execution.decision?.kind).toBe('action');
});

test('v8 §§3.6.7, 3.6.11: removing an Experience immediately lowers HP, defeats the unit, and cleans up all its upgrades', () => {
  const fixture = position();
  fixture.players[0].hand = [{ card: constable, ref: 'constable' }];
  fixture.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
  fixture.players[1].ground = [{ card: ids.marine, ref: 'victim', damage: 3 }];
  fixture.attachments = [
    { card: 'experience', unit: 'victim', ref: 'experience' },
    { card: 'shield', unit: 'victim', ref: 'shield' },
  ];
  const { refs, state: initial } = scenario(fixture);
  let state = step(initial, 'play');
  expect(state.execution.decision?.options.map(o => o.intent.kind)).toContain('decline-effect');
  const input = choose(state, i => i.kind === 'target' && i.card === refs.experience);
  expect(freshResume(state, input)).toEqual(advance(state, input).state);
  state = advance(state, input).state;
  expect(instance(state, refs.victim!).zone).toBe('discard');
  expect([refs.experience, refs.shield].map(id => instance(state, id!).zone)).toEqual([
    'set-aside',
    'set-aside',
  ]);
  expect(state.facts.filter(f => f.type === 'damage-prevented')).toEqual([]);
  expect(decodeState(encodeState(state))).toEqual(state);
});

test('upgrade removal can be declined, works across arenas and owners, and cannot target a unit', () => {
  const fixture = position();
  fixture.players[0].hand = [{ card: constable }];
  fixture.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
  fixture.players[1].space = [{ card: ids.fighter, ref: 'fighter' }];
  fixture.attachments = [
    { card: 'academy-training', unit: 'fighter', owner: 'alice', ref: 'training' },
  ];
  const { refs, state: initial } = scenario(fixture);
  const pending = step(initial, 'play');
  expect(pending.execution.decision?.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.training! },
    { kind: 'decline-effect' },
  ]);
  expect(instance(step(pending, 'decline-effect'), refs.training!).zone).toBe('space');
  const state = target(pending, refs.training!);
  expect(state.players.alice!.discard).toContain(refs.training!);
  expect(state.players.bob!.discard).not.toContain(refs.training!);
  expect(instance(state, refs.fighter!).zone).toBe('space');
});

test('v8 §§3.4, 3.6.11: leader defeat cleans up upgrades and preserves its own ability use history', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.racer, ref: 'attacker' }];
  fixture.players[1].leader = {
    card: ids.leader,
    ref: 'leader',
    deployedAs: 'unit',
    damage: 4,
    abilityUses: { deploy: 1 },
  };
  fixture.attachments = [
    { card: 'academy-training', unit: 'leader', owner: 'alice', ref: 'training' },
  ];
  const { state: initial, refs } = scenario(fixture);
  const state = step(initial, i => i.kind === 'attack' && i.defender === refs.leader);
  expect(instance(state, refs.leader!).deployedAs).toBe(null);
  expect(instance(state, refs.leader!).abilityUses).toEqual({ deploy: 1 });
  expect(instance(state, refs.training!).zone).toBe('discard');
  expect(instance(state, refs.training!).attachedTo).toBeNull();
});

test('arena movement preserves attachment identities; a returning physical unit cannot regain old attachments', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  fixture.attachments = [{ card: 'experience', unit: 'unit', ref: 'upgrade' }];
  const { state, refs } = scenario(fixture);
  const unit = instance(state, refs.unit!),
    upgrade = instance(state, refs.upgrade!);
  const original = { unit: unit.incarnation, upgrade: upgrade.incarnation };
  move(state, unit, 'space');
  expect(upgrade.zone).toBe('space');
  expect([unit.incarnation, upgrade.incarnation]).toEqual([original.unit, original.upgrade]);
  move(state, unit, 'hand');
  move(state, unit, 'ground');
  expect(attachedUpgrades(state, unit)).toEqual([]);
  expect(unit.incarnation).toBeGreaterThan(original.unit);
});

test('attachment checkpoints reject dangling, cyclic, mismatched-incarnation and token-zone data', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  fixture.attachments = [{ card: 'shield', unit: 'unit', ref: 'shield' }];
  const { state, refs } = scenario(fixture);
  for (const parent of [
    { instanceId: 'missing', incarnation: 1 },
    { instanceId: refs.shield!, incarnation: 1 },
    { instanceId: refs.unit!, incarnation: 500 },
  ]) {
    const corrupt = structuredClone(state);
    corrupt.cards[refs.shield!]!.attachedTo = parent;
    expect(() => decodeState(encodeState(corrupt))).toThrow();
  }
  const corrupt = structuredClone(state);
  move(corrupt, instance(corrupt, refs.shield!), 'hand');
  expect(instance(corrupt, refs.shield!).zone).toBe('set-aside');
  const invalid = structuredClone(state);
  invalid.cards[refs.shield!]!.owner = 'unknown-player';
  invalid.cards[refs.shield!]!.controller = 'bob';
  expect(() => decodeState(encodeState(invalid))).toThrow();
});

test('views expose opaque exact attachment links and choices without disclosing private resources or set-aside tokens', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  fixture.players[1].hand = [{ card: constable }];
  fixture.players[1].resources = [{ card: ids.marine }, { card: ids.marine }];
  fixture.attachments = [{ card: 'experience', unit: 'unit', ref: 'exp' }];
  fixture.activePlayer = 'bob';
  const { refs, state: initial } = scenario(fixture);
  const pending = step(initial, 'play');
  const view = new Projector(pending.gameId, { role: 'player', playerId: 'bob' }).project(pending);
  const unit = view.cards.find(c => c.face?.cardId === ids.marine && c.zone === 'ground')!;
  const exp = view.cards.find(c => c.face?.cardId === 'experience')!;
  expect(exp.attachedTo).toBe(unit.id);
  expect(unit.face).toMatchObject({ power: 4, hp: 4 });
  expect(view.decision?.options.find(o => o.kind === 'target')?.cards).toEqual([exp.id]);
  const spectator = new Projector(pending.gameId, { role: 'spectator' }, 's'.repeat(32));
  const before = spectator.project(pending);
  expect(before.decision).toBeNull();
  const secret = structuredClone(pending);
  instance(secret, secret.players.bob!.resources[0]!).cardId = 'academy-training';
  expect(spectator.project(secret)).toEqual(before);
  const endedChoice = target(pending, refs.exp!);
  const after = spectator.project(endedChoice);
  expect(after.cards.some(c => c.face?.cardId === 'experience')).toBe(false);
  expect(after.events.find(e => e.type === 'defeated')?.cards[0]?.currentCardId).toBeNull();
});

test('Sentinel also constrains an Ambush target set and allows a choice among multiple Sentinels', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  fixture.players[1].ground = [
    { card: commando, ref: 'one' },
    { card: commando, ref: 'two', exhausted: true },
    { card: ids.marine },
  ];
  const { state, refs } = scenario(fixture);
  expect(attackTargets(state, instance(state, refs.attacker!), true)).toEqual([
    refs.one!,
    refs.two!,
  ]);
  const intents = frameIntents(state, {
    kind: 'effect',
    playerId: 'alice',
    source: instance(state, refs.attacker!),
    effect: { kind: 'ambush' },
  });
  expect(intents).toEqual([
    { kind: 'target', card: refs.one! },
    { kind: 'target', card: refs.two! },
    { kind: 'decline-effect' },
  ]);
});

test('zero damage does not consume a Shield', () => {
  const fixture = position();
  fixture.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  fixture.attachments = [{ card: 'shield', unit: 'unit', ref: 'shield' }];
  const { state, refs } = scenario(fixture);
  state.execution.decision = null;
  state.execution.frames.unshift({
    kind: 'damage',
    actor: 'alice',
    assignments: [
      {
        target: reference(instance(state, refs.unit!)),
        amount: 0,
        source: null,
        preventedBy: null,
      },
    ],
  });
  settle(state);
  expect(instance(state, refs.shield!).zone).toBe('ground');
  expect(state.facts).toEqual([]);
  expect(decodeState(encodeState(state))).toEqual(state);
});

test('attachment games replay every accepted input and do not mutate another game', () => {
  const c = config('attachment-recording');
  for (const player of c.players)
    player.deck = [
      { cardId: ids.marine, quantity: 3 },
      { cardId: 'academy-training', quantity: 3 },
      { cardId: constable, quantity: 6 },
      { cardId: commando, quantity: 12 },
    ];
  const game = new LocalGame(c, upper => upper - 1);
  const other = new LocalGame({ ...c, gameId: 'separate-attachment-game' }, upper => upper - 1);
  const untouched = other.state;
  let state = setup(game);
  for (let n = 0; n < 160 && !state.result; n++) {
    const d = state.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'play') ??
      d.options.find(
        o =>
          o.intent.kind === 'attack' &&
          o.intent.defender !== state.players.alice!.base &&
          o.intent.defender !== state.players.bob!.base,
      ) ??
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options[0]!;
    state = game.submit(
      choose(
        state,
        i => i === option.intent,
        d.selection ? d.selection.cards.slice(-d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect(state.facts.some(f => f.type === 'attached')).toBe(true);
  expect(state.facts.some(f => f.type === 'damage-prevented')).toBe(true);
  expect(other.state).toEqual(untouched);
}, 15_000);
