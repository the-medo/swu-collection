import { LocalGame, replay } from '../host/session.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, defeatUpgrade, sourcePower, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { instance, move } from '../engine/state.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position, config, setup } from './helpers.ts';

const latts = 'latts-razzi--deadly-whipmaster';
function fixture() {
  const p = position('latts-scenario');
  p.players[0].hand = [{ card: latts, ref: 'latts' }];
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  return p;
}
function step(state: GameState, choice: Intent['kind'] | ((intent: Intent) => boolean)) {
  return advance(state, choose(state, choice)).state;
}
function resume(state: GameState, input: unknown) {
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

test('LAW 039: Shield choice gives a separate token, then Latts deals her current two power to an enemy ground unit', () => {
  const { state: initial, refs } = scenario(fixture());
  let state = step(initial, 'play');
  expect(state.execution.decision?.options.map(o => o.intent)).toEqual([
    { kind: 'choose-token', token: 'shield' },
    { kind: 'choose-token', token: 'experience' },
  ]);
  const input = choose(state, i => i.kind === 'choose-token' && i.token === 'shield');
  expect(resume(state, input)).toEqual(advance(state, input).state);
  state = advance(state, input).state;
  expect(attachedUpgrades(state, instance(state, refs.latts!)).map(c => c.cardId)).toEqual([
    'shield',
  ]);
  expect(state.execution.decision?.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.enemy! },
  ]);
  expect(resume(state, choose(state, 'target'))).toEqual(step(state, 'target'));
  state = step(state, 'target');
  expect(instance(state, refs.enemy!).damage).toBe(2);
  expect(state.facts.find(f => f.type === 'damage')?.cards.map(c => c.instanceId)).toEqual([
    refs.latts!,
    refs.enemy!,
  ]);
});

test('LAW 039: Experience increases power before damage; enemy Shield replacement runs inside her ability', () => {
  const p = fixture();
  p.attachments = [1, 2].map(n => ({ card: 'shield', unit: 'enemy', ref: `shield${n}` }));
  const { state: initial, refs } = scenario(p);
  let state = step(
    step(initial, 'play'),
    i => i.kind === 'choose-token' && i.token === 'experience',
  );
  expect(unitStats(state, instance(state, refs.latts!))).toEqual({ power: 3, hp: 2 });
  state = step(state, 'target');
  expect(state.execution.decision?.kind).toBe('replacement');
  expect(state.execution.decision?.playerId).toBe('bob');
  const input = choose(state, i => i.kind === 'target' && i.card === refs.shield2);
  expect(resume(state, input)).toEqual(advance(state, input).state);
  state = advance(state, input).state;
  expect(instance(state, refs.enemy!).damage).toBe(0);
  expect(instance(state, refs.shield1!).zone).toBe('ground');
  expect(instance(state, refs.shield2!).zone).toBe('set-aside');
  expect(state.facts.find(f => f.type === 'damage-prevented')?.amount).toBe(3);
  expect(state.execution.decision?.kind).toBe('action');
});

test('Experience branch defeats a three-HP unit and finishes nested defeat observers before passing the action', () => {
  const p = fixture();
  p.players[0].ground!.push({ card: 'hk-47--exclamation--die--meatbag-' });
  const { state: initial, refs } = scenario(p);
  const state = step(
    step(step(initial, 'play'), i => i.kind === 'choose-token' && i.token === 'experience'),
    'target',
  );
  expect(instance(state, refs.enemy!).zone).toBe('discard');
  expect(instance(state, state.players.bob!.base).damage).toBe(1);
  expect(state.activePlayer).toBe('bob');
});

test('without an enemy ground unit the mandatory token instruction still resolves', () => {
  const p = fixture();
  p.players[1].ground = [];
  const { state: initial, refs } = scenario(p);
  const state = step(
    step(initial, 'play'),
    i => i.kind === 'choose-token' && i.token === 'experience',
  );
  expect(attachedUpgrades(state, instance(state, refs.latts!)).map(c => c.cardId)).toEqual([
    'experience',
  ]);
  expect(state.execution.decision?.kind).toBe('action');
  expect(state.facts.some(f => f.type === 'damage')).toBe(false);
});

test('uniqueness can defeat the newly played Latts before her trigger; her ability cannot upgrade the surviving copy', () => {
  const p = fixture();
  p.players[0].ground!.push({ card: latts, ref: 'older' });
  p.attachments = [{ card: 'experience', unit: 'older' }];
  const { state: initial, refs } = scenario(p);
  let state = step(initial, 'play');
  state = step(state, i => i.kind === 'keep-unique' && i.card === refs.older);
  expect(instance(state, refs.latts!).zone).toBe('discard');
  expect(state.execution.decision?.options.map(o => o.intent.kind)).toEqual(['target']);
  expect(attachedUpgrades(state, instance(state, refs.older!))).toHaveLength(1);
  expect(state.departedUnits.find(h => h.reference.instanceId === refs.latts)?.power).toBe(2);
  const input = choose(state, 'target');
  expect(resume(state, input)).toEqual(advance(state, input).state);
  const corrupt = structuredClone(state);
  corrupt.departedUnits = [];
  expect(() => decodeState(encodeState(corrupt))).toThrow();
  state = advance(state, input).state;
  expect(instance(state, refs.enemy!).damage).toBe(2);
  const view = new Projector(state.gameId, { role: 'spectator' }).project(state);
  const event = view.events.find(f => f.type === 'damage')!;
  const discarded = view.cards.find(c => c.face?.cardId === latts && c.zone === 'discard')!;
  expect(event.cards[0]!.currentCardId).toBe(discarded.id);
});

test('v8 §8.11: a power-based continuation uses departure modifiers, even after that physical card returns', () => {
  const p = fixture();
  p.players[0].hand = [];
  p.players[0].ground = [{ card: latts, ref: 'source' }];
  p.attachments = [
    { card: 'academy-training', unit: 'source', ref: 'training' },
    { card: 'experience', unit: 'source', ref: 'experience' },
  ];
  const { state, refs } = scenario(p);
  const source = structuredClone(instance(state, refs.source!));
  move(state, instance(state, refs.source!), 'hand');
  defeatUpgrade(state, instance(state, refs.training!));
  defeatUpgrade(state, instance(state, refs.experience!));
  move(state, instance(state, refs.source!), 'ground');
  expect(unitStats(state, instance(state, refs.source!)).power).toBe(2);
  expect(sourcePower(state, source)).toBe(5);
  // Exercise the shared continuation directly; Latts has no extra printed ability.
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames('alice', source, [
      {
        kind: 'damage-unit',
        amount: 'source-power',
        arena: 'ground',
        controller: 'enemy',
        optional: false,
      },
    ]),
    { kind: 'action' },
  ];
  settle(state);
  const input = choose(state, 'target');
  const after = advance(state, input).state;
  expect(resume(state, input)).toEqual(after);
  expect(after.facts.find(f => f.type === 'damage')?.amount).toBe(5);
  const view = new Projector(state.gameId, { role: 'spectator' }).project(after);
  expect(view.events.find(f => f.type === 'damage')?.cards[0]?.currentCardId).toBeNull();
  const corrupt = structuredClone(state);
  corrupt.departedUnits.push(corrupt.departedUnits[0]!);
  expect(() => decodeState(encodeState(corrupt))).toThrow();
});

test('projected token choices are public card identities under private decision ownership', () => {
  const { state: initial } = scenario(fixture());
  const state = step(initial, 'play');
  const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' });
  const view = projector.project(state);
  expect(view.decision?.options.map(o => o.tokenCardId)).toEqual(['shield', 'experience']);
  const option = view.decision!.options.find(o => o.tokenCardId === 'experience')!;
  const next = advance(
    state,
    projector.command(state, {
      gameId: state.gameId,
      epoch: view.epoch,
      expectedRevision: view.revision,
      decisionId: view.decision!.id,
      optionId: option.id,
    }),
  ).state;
  expect(new Projector(state.gameId, { role: 'spectator' }).project(state).decision).toBeNull();
  expect(next.execution.decision?.kind).toBe('effect');
  const other = structuredClone(state);
  other.departedUnits = [
    {
      printedPower: 3,
      printedHp: 3,
      traits: [],
      leaderUnit: false,
      reference: { instanceId: 'made-up', cardId: ids.marine, incarnation: 9, visibility: 3 },
      controller: 'bob',
      power: 100,
      hp: 100,
      damage: 0,
      arena: 'ground',
      upgraded: false,
      upgrades: [],
      abilities: [],
    },
  ];
  const spectator = new Projector(state.gameId, { role: 'spectator' }, 'k'.repeat(32));
  expect(spectator.project(state)).toEqual(spectator.project(other));
});

// Replaying every prefix of 160 inputs is a long correctness check, not a benchmark.
test('recordings replay Latts token choices, uniqueness, damage and departure history at every accepted input', () => {
  const c = config('latts-recording');
  c.players[0].deck = [
    { cardId: latts, quantity: 12 },
    { cardId: ids.marine, quantity: 12 },
  ];
  c.players[1].deck = [{ cardId: ids.marine, quantity: 24 }];
  const game = new LocalGame(c, upper => upper - 1);
  let state = setup(game);
  const tokens = new Set<string>();
  for (let n = 0; n < 160 && !state.result; n++) {
    const d = state.execution.decision!;
    const option =
      d.options.find(
        o =>
          o.intent.kind === 'choose-token' &&
          o.intent.token === (tokens.has('shield') ? 'experience' : 'shield'),
      ) ??
      d.options.findLast(o => o.intent.kind === 'keep-unique') ??
      d.options.find(o => o.intent.kind === 'play') ??
      d.options.find(
        o =>
          o.intent.kind === 'attack' &&
          ![state.players.alice!.base, state.players.bob!.base].includes(o.intent.defender),
      ) ??
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options[0]!;
    if (option.intent.kind === 'choose-token') tokens.add(option.intent.token);
    state = game.submit(
      choose(
        state,
        i => i === option.intent,
        d.selection ? d.selection.cards.slice(-d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect([...tokens].sort()).toEqual(['experience', 'shield']);
  expect(state.departedUnits.some(entry => entry.reference.cardId === latts)).toBe(true);
}, 30_000);
