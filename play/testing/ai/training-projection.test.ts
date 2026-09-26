import { expect, test } from 'bun:test';
import { advance } from '../../engine/advance.ts';
import { fact, instance, move } from '../../engine/state.ts';
import { Projector } from '../../projection/projector.ts';
import type { Viewer } from '../../projection/projector.ts';
import { gameViewSchema } from '../../view/types.ts';
import { ids, position } from '../helpers.ts';
import { scenario } from '../scenario.ts';

const key = 'training-projection-parity-test-secret';

test('incremental events retain private visibility, public ordering and scoped handles', () => {
  const input = position();
  input.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const { state, refs } = scenario(input);
  fact(state, 'played', 'alice', [instance(state, refs.unit!)]);
  for (const viewer of [
    { role: 'player', playerId: 'alice' },
    { role: 'player', playerId: 'bob' },
    { role: 'spectator' },
  ] satisfies Viewer[]) {
    const full = new Projector(state.gameId, viewer, key);
    const incremental = new Projector(state.gameId, viewer, key, { training: true });
    const first = incremental.project(state);
    expect(first).toEqual(full.project(state));
    expect(incremental.project(state)).toBe(first);
    const next = structuredClone(state);
    next.revision++;
    fact(next, 'played', 'bob', [], null, ['bob']);
    fact(next, 'played', 'alice', [], null, ['alice']);
    next.facts.at(-1)!.namedCard = ids.marine;
    next.facts.at(-1)!.mode = 'plot';
    fact(next, 'played', 'alice', [instance(next, refs.unit!)]);
    const expected = full.project(next),
      actual = incremental.project(next);
    expect(actual.events).toEqual(expected.events.slice(first.events.length));
    expect(actual.cards).toEqual(expected.cards);
    expect(gameViewSchema.parse(actual)).toEqual(actual);
    expect(incremental.project(next)).toBe(actual);
    const hidden = structuredClone(next);
    hidden.revision++;
    move(hidden, instance(hidden, refs.unit!), 'hand');
    fact(hidden, 'played', 'alice', [], null, ['alice']);
    const after = incremental.project(hidden),
      fullAfter = full.project(hidden);
    expect(after.cards).toEqual(fullAfter.cards);
    expect(after.events).toEqual(fullAfter.events.slice(expected.events.length));
    expect(fullAfter.events[0]!.cards[0]!.currentCardId).toBeNull();
    const returned = structuredClone(hidden);
    returned.revision++;
    move(returned, instance(returned, refs.unit!), 'ground');
    fact(returned, 'played', 'alice', [instance(returned, refs.unit!)]);
    const latest = incremental.project(returned),
      fullLatest = full.project(returned);
    expect(latest.events).toEqual(fullLatest.events.slice(fullAfter.events.length));
    expect(latest.cards).toEqual(fullLatest.cards);
    expect(latest.events.at(-1)!.cards[0]!.currentCardId).not.toBe(
      first.events[0]!.cards[0]!.currentCardId,
    );
  }
});

test('cached training projection still rejects forged, stale and wrong-seat commands', () => {
  const { state } = scenario(position());
  const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' }, key, {
    training: true,
  });
  const view = projector.project(state),
    decision = view.decision!;
  const command = {
    gameId: view.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: decision.id,
    optionId: decision.options.find(
      o => o.kind === 'use-ability' && o.action?.id === 'damage-bases',
    )!.id,
  };
  expect(() => projector.command(state, { ...command, optionId: 'forged' })).toThrow();
  expect(() => projector.project({ ...state, gameId: 'other' })).toThrow();
  expect(() =>
    new Projector(state.gameId, { role: 'player', playerId: 'bob' }, key, {
      training: true,
    }).command(state, command),
  ).toThrow();
  const next = advance(state, projector.command(state, command)).state;
  expect(() => projector.command(next, command)).toThrow();
  expect(() => projector.project(state)).toThrow('forward-only');
  const truncated = structuredClone(next);
  truncated.revision++;
  truncated.facts = [];
  expect(() => projector.project(truncated)).toThrow('forward-only');
  next.revision++;
  expect(() => projector.project(next)).toThrow('immutable');
});

test('identifier cache eviction preserves original HMACs and viewer isolation', () => {
  const { state } = scenario(position());
  for (let i = 0; i < 4200; i++) fact(state, 'played', 'alice');
  const viewer = { role: 'player', playerId: 'alice' } as const;
  const full = new Projector(state.gameId, viewer, key);
  const cached = new Projector(state.gameId, viewer, key, { training: true });
  const first = cached.project(state);
  expect(first).toEqual(full.project(state));
  const next = structuredClone(state);
  next.revision++;
  fact(next, 'played', 'alice');
  const actual = cached.project(next),
    expected = full.project(next);
  expect(actual.cards).toEqual(expected.cards);
  expect(actual.decision).toEqual(expected.decision);
  expect(actual.events).toEqual(expected.events.slice(first.events.length));
  const other = new Projector(state.gameId, { role: 'player', playerId: 'bob' }, key, {
    training: true,
  }).project(state);
  expect(other.events[0]!.id).not.toBe(first.events[0]!.id);
});
