import { test, expect } from 'bun:test';
import {
  rotationCases,
  rotationManifest,
  rotationRows,
} from '../../ai/practice/rotation-curriculum.ts';
import { practiceRoster } from '../../ai/practice/positions.ts';
import { decodeDeckSnapshot } from '../../admission/decks.ts';
import originalRoster from '../../ai/full-game/league-decks.json';

test('training roster uses both exact requested decks and preserves the original six', () => {
  expect(practiceRoster.decks.slice(0, 6).map(d => d.snapshot)).toEqual(
    originalRoster.decks.map(d => decodeDeckSnapshot(d.snapshot, {})),
  );
  const chewbacca = practiceRoster.decks.find(d => d.key === 'chewbacca')!;
  const luke = practiceRoster.decks.find(d => d.key === 'luke')!;
  expect(chewbacca.snapshot.sourceDeckId).toBe('b2124fd3-de75-403a-8ef6-1263a23ad47b');
  expect(chewbacca.strategies).toEqual(['aggro']);
  expect(luke.snapshot.sourceDeckId).toBe('05961f2c-3d74-4206-8709-dc7ff20b47d5');
  expect(luke.strategies).toEqual(['space-aggro']);
});

test('all eight saved decks have twelve families, ten trained and two completely held out', () => {
  expect(practiceRoster.decks.map(d => d.key)).toEqual([
    'greef',
    'vader',
    'mandalorian',
    'dedra',
    'aurra',
    'krennic',
    'chewbacca',
    'luke',
  ]);
  for (const deck of practiceRoster.decks) {
    const cases = rotationManifest.cases.filter(c => c.deck === deck.key);
    const train = new Set(cases.filter(c => c.split === 'train').map(c => c.family));
    const heldout = new Set(cases.filter(c => c.split === 'heldout').map(c => c.family));
    expect(train.size).toBe(10);
    expect(heldout.size).toBe(2);
    expect([...heldout].some(f => train.has(f))).toBe(false);
  }
});
for (const item of rotationCases)
  test(`engine, visible encoding and replay: ${item.id}`, () => {
    const rows = rotationRows(item.id);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.acceptable).toContain(row.action);
      expect(row.context.every(Number.isFinite)).toBe(true);
      expect(row.candidates.every(c => c.every(Number.isFinite))).toBe(true);
    }
  });
