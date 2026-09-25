import { expect, test } from 'bun:test';
import { encodeTrajectory, decodeTrajectory } from '../../ai/datasets/trajectory.ts';
import { humanExamples } from '../../ai/datasets/examples.ts';
import { sha256 } from '../../ai/releases/objects.ts';
import { humanFixture } from './human-fixture.ts';
test('verified human choices roundtrip through private views, preserve both seats and produce learning rows', () => {
  const { fixture, decks, metadata } = humanFixture();
  const bytes = encodeTrajectory(fixture.history, metadata, decks, 'private'.repeat(8));
  expect(bytes).toEqual(encodeTrajectory(fixture.history, metadata, decks, 'private'.repeat(8)));
  const trajectory = decodeTrajectory(bytes, sha256(bytes));
  const raw = JSON.stringify(trajectory);
  expect(raw).not.toContain(fixture.history.gameId);
  expect(raw).not.toContain('history_key');
  expect(raw).not.toContain('sourceDeckId');
  expect(raw).not.toContain('requestHash');
  const rows = [...humanExamples(trajectory)];
  expect(rows.length).toBeGreaterThan(2);
  expect(new Set(rows.map(r => r.seat))).toEqual(new Set([0, 1]));
  expect(
    rows.every(r => r.return === (r.seat === 0 ? 1 : -1) && r.action < r.candidates.length),
  ).toBe(true);
  fixture.history.stateHash = 'f'.repeat(64);
  expect(() => encodeTrajectory(fixture.history, metadata, decks, 'private'.repeat(8))).toThrow(
    'integrity',
  );
  expect(() => decodeTrajectory(bytes, 'f'.repeat(64))).toThrow('integrity');
});
