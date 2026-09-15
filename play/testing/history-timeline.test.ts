import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import {
  cursorOf,
  initialCursor,
  restoreActionState,
  stepTimeline,
  undoTarget,
  undoTimeline,
} from '../history/timeline.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

function resolve(state: GameState, input: EngineInput) {
  let next = advance(state, input).state;
  while (next.execution.random)
    next = advance(next, {
      type: 'random',
      gameId: next.gameId,
      expectedRevision: next.revision,
      requestId: next.execution.random.id,
      values: next.execution.random.bounds.map(() => 0),
    }).state;
  return next;
}

test('one root action includes Kelleran search, random outcomes and the nested play', () => {
  const p = position();
  p.players[0].hand = [{ card: 'kelleran-beq--the-sabered-hand' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].deck![0] = { card: ids.trooper, ref: 'found' };
  const fixture = scenario(p),
    initial = fixture.state;
  let state = initial,
    cursor = initialCursor();
  for (const [kind, selections] of [
    ['play', []],
    ['search', [fixture.refs.found!]],
    ['play', []],
  ] as const) {
    const input = choose(state, kind, [...selections]);
    const after = resolve(state, input);
    const entry = stepTimeline(cursor, state, after, input);
    expect(entry.action?.id).toBe(1);
    expect(entry.action?.start).toBe(0);
    cursor = cursorOf(JSON.parse(JSON.stringify(entry)));
    state = decodeState(encodeState(after));
    expect(undoTarget(cursor, state, 'alice')).toBe(0);
    expect(undoTarget(cursor, state, 'bob')).toBeNull();
  }
  expect(cursor.openAction).toBeNull();
  expect(state.cards[fixture.refs.found!]!.zone).toBe('ground');

  const restored = restoreActionState(state, initial);
  expect(restored.players).toEqual(initial.players);
  expect(restored.cards).toEqual(initial.cards);
  expect(restored.execution).toEqual(initial.execution);
  expect(restored.revision).toBe(state.revision + 1);
  expect(restored.nextId).toBe(state.nextId);
  const undo = undoTimeline(cursor, initialCursor());
  expect(undo.sequence).toBe(4);
  expect(undo.branch).toBe(4);
  expect(undo.parent).toBe(0);
  const input = choose(restored, 'pass');
  const alternative = stepTimeline(cursorOf(undo), restored, resolve(restored, input), input);
  expect(alternative.action?.id).toBe(5);
  expect(alternative.branch).toBe(4);
  expect(alternative.parent).toBe(4);
  // The original cursor/position remains valid and immutable for bookmarks.
  expect(cursor.sequence).toBe(3);
  expect(cursor.branch).toBe(0);
});

test('the next root action replaces undo eligibility, even for consecutive extra actions', () => {
  const p = position();
  p.extraActions = 1;
  let state = scenario(p).state,
    cursor = initialCursor();
  const first = choose(state, 'pass'),
    after = resolve(state, first);
  cursor = cursorOf(stepTimeline(cursor, state, after, first));
  state = after;
  const input = choose(state, 'pass'),
    next = resolve(state, input);
  const second = stepTimeline(cursor, state, next, input);
  expect(second.action?.id).toBe(2);
  expect(second.action?.start).toBe(1);
  expect(second.action?.actor).toBe('alice');
});

test('restoration rejects unrelated or non-action positions and preserves current disclosure', () => {
  const initial = scenario(position()).state;
  const after = resolve(initial, choose(initial, 'pass'));
  after.disclosure.handsToSpectators = true;
  expect(restoreActionState(after, initial).disclosure).toEqual(after.disclosure);
  expect(() => restoreActionState(initial, initial)).toThrow('Invalid undo');
  expect(() => restoreActionState(after, { ...initial, gameId: 'another-game' })).toThrow(
    'Invalid undo',
  );
  expect(() => undoTimeline(initialCursor(), initialCursor())).toThrow('Invalid undo');
});
