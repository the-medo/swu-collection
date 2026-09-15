import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import { continuationCases } from './continuations.ts';

test('the recovery workload preserves exact transitions and all three views at every covered suspension', () => {
  const fixtures = continuationCases();
  expect(new Set(fixtures.map(f => f.name)).size).toBe(358);
  for (const fixture of fixtures) {
    const before = encodeState(fixture.state);
    const restored = decodeState(before);
    const expected = advance(fixture.state, fixture.input);
    const actual = advance(restored, fixture.input);
    expect(actual).toEqual(expected);
    expect(encodeState(fixture.state)).toBe(before);
    for (const viewer of [
      { role: 'spectator' } as const,
      ...fixture.state.seats.map(playerId => ({ role: 'player' as const, playerId })),
    ]) {
      const projector = () => new Projector(fixture.state.gameId, viewer, 'v'.repeat(32));
      expect(projector().project(restored)).toEqual(projector().project(fixture.state));
      expect(projector().project(actual.state)).toEqual(projector().project(expected.state));
    }
  }
}, 15_000);
