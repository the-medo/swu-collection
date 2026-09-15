import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decisionForPlayer } from '../engine/resource-plans.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, config, position } from './helpers.ts';
import { LocalGame } from '../host/session.ts';

function plan(state: GameState, playerId: string, selections: string[] = []): EngineInput {
  const d = decisionForPlayer(state, playerId)!;
  return {
    type: 'decision',
    gameId: state.gameId,
    expectedRevision: state.revision,
    playerId,
    decisionId: d.id,
    optionId: d.options[0]!.id,
    selections,
  };
}
function regroup() {
  let state = scenario(position()).state;
  state = advance(state, choose(state, 'pass')).state;
  return advance(state, choose(state, 'pass')).state;
}
function resume(state: GameState, input: EngineInput) {
  expect(decodeState(encodeState(state))).toEqual(state);
  const process = Bun.spawnSync(
    [Bun.which('bun')!, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(process.stderr.toString()).toBe('');
  expect(process.exitCode).toBe(0);
  expect(JSON.parse(process.stdout.toString())).toEqual(advance(state, input));
}

test('early resource confirmation stays private and resolves in initiative order after recovery', () => {
  const initial = regroup();
  const first = new Projector(initial.gameId, { role: 'player', playerId: 'alice' });
  const second = new Projector(initial.gameId, { role: 'player', playerId: 'bob' });
  const spectator = new Projector(initial.gameId, { role: 'spectator' });
  const firstView = first.project(initial),
    spectatorView = spectator.project(initial);
  const view = second.project(initial);
  expect(gameViewSchema.parse(view)).toEqual(view);
  expect(view.decision?.kind).toBe('resource');
  const selected = view.decision!.selection!.cards[0]!;
  const input = second.command(initial, {
    gameId: initial.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: view.decision!.options[0]!.id,
    selections: [selected],
  });
  const queued = advance(initial, input);
  expect(queued.facts).toEqual([]);
  expect(queued.state.players.bob!.hand).toEqual(initial.players.bob!.hand);
  expect(queued.state.players.bob!.resources).toEqual(initial.players.bob!.resources);
  expect(first.project(queued.state)).toEqual(firstView);
  expect(spectator.project(queued.state)).toEqual(spectatorView);
  expect(second.project(queued.state).decision!.resourcePlan).toEqual({
    confirmed: true,
    cards: [selected],
  });
  const firstInput = choose(queued.state, 'resource', [queued.state.players.alice!.hand[0]!]);
  resume(queued.state, firstInput);
  const done = advance(queued.state, firstInput);
  expect(done.state.phase).toBe('action');
  expect(done.state.players.alice!.resources).toHaveLength(1);
  expect(done.state.players.bob!.resources).toHaveLength(1);
  expect(
    done.facts.filter(f => f.type === 'resourced' && f.audience === 'public').map(f => f.actor),
  ).toEqual(['alice', 'bob']);
});

test('an early choice can be changed, skipped, or withheld to see the first resource decision', () => {
  const initial = regroup();
  const queued = advance(initial, plan(initial, 'bob', [initial.players.bob!.hand[0]!])).state;
  const cancelled = advance(queued, plan(queued, 'bob')).state;
  expect(decisionForPlayer(cancelled, 'bob')!.selection!.max).toBe(1);
  const skipped = advance(cancelled, plan(cancelled, 'bob')).state;
  const done = advance(skipped, choose(skipped, 'resource', [])).state;
  expect(done.phase).toBe('action');
  expect(done.players.bob!.resources).toHaveLength(0);
  const waited = advance(
    initial,
    choose(initial, 'resource', [initial.players.alice!.hand[0]!]),
  ).state;
  expect(waited.execution.decision!.playerId).toBe('bob');
  expect(waited.players.alice!.resources).toHaveLength(1);
  expect(decisionForPlayer(waited, 'bob')).toBe(waited.execution.decision);
});

test('setup supports two-card plans and rejects invalid ownership, amounts and stale commands', () => {
  const game = new LocalGame(config('parallel-setup'), () => 0);
  let s = game.state;
  s = game.submit(choose(s, i => i.kind === 'initiative' && i.playerId === 'alice'));
  s = game.submit(choose(s, i => i.kind === 'mulligan' && !i.take));
  s = game.submit(choose(s, i => i.kind === 'mulligan' && !i.take));
  const invalid = plan(s, 'bob', [s.players.alice!.hand[0]!, s.players.bob!.hand[0]!]);
  expect(() => advance(s, invalid)).toThrow();
  expect(() => advance(s, plan(s, 'bob', []))).toThrow();
  const input = plan(s, 'bob', s.players.bob!.hand.slice(0, 2));
  const queued = game.submit(input);
  expect(() => advance(queued, input)).toThrow();
  resume(queued, choose(queued, 'resource', queued.players.alice!.hand.slice(0, 2)));
  s = game.submit(choose(queued, 'resource', queued.players.alice!.hand.slice(0, 2)));
  expect(s.phase).toBe('action');
  expect(s.players.bob!.resources).toHaveLength(2);
  expect(s.players.bob!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
});

test('an in-flight early confirmation survives only the immediate unchanged resource handoff', () => {
  const initial = regroup();
  const projector = new Projector(initial.gameId, { role: 'player', playerId: 'bob' });
  const view = projector.project(initial);
  const command = {
    gameId: view.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: view.decision!.options[0]!.id,
    selections: [view.decision!.selection!.cards[0]!],
  };
  const promoted = advance(initial, choose(initial, 'resource', [])).state;
  projector.project(promoted);
  expect(() => projector.command(promoted, { ...command, epoch: 'forged' })).toThrow();
  expect(() => projector.command(promoted, { ...command, selections: ['forged'] })).toThrow();
  const completed = advance(promoted, projector.command(promoted, command)).state;
  expect(completed.phase).toBe('action');
  expect(completed.players.bob!.resources).toHaveLength(1);
  expect(() => projector.command(completed, command)).toThrow();

  const changedProjector = new Projector(initial.gameId, { role: 'player', playerId: 'bob' });
  const old = changedProjector.project(initial);
  const changed = structuredClone(promoted);
  changed.cards[changed.players.bob!.hand[0]!]!.incarnation++;
  expect(() =>
    changedProjector.command(changed, {
      ...command,
      epoch: old.epoch,
      decisionId: old.decision!.id,
      optionId: old.decision!.options[0]!.id,
      selections: [old.decision!.selection!.cards[0]!],
    }),
  ).toThrow();
});
