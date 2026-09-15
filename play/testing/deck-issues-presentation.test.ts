import { expect, test } from 'bun:test';
import { groupDeckIssues } from '../../frontend/src/components/app/crossfire/deckIssues.ts';

test('deck check counts distinct cards and groups repeated reasons across zones', () => {
  const report = groupDeckIssues([
    { code: 'unknown-card', cardId: 'unknown', zone: 'mainboard' },
    { code: 'unknown-card', cardId: 'unknown', zone: 'mainboard' },
    { code: 'unknown-card', cardId: 'another', zone: 'leader' },
    { code: 'unsupported-card', cardId: 'future', zone: 'mainboard' },
    { code: 'unsupported-card', cardId: 'future', zone: 'sideboard' },
    { code: 'missing-card', zone: 'base' },
    { code: 'deck-size' },
  ]);
  expect(report.cardCount).toBe(3);
  expect(report.deckIssueCount).toBe(2);
  expect(report.groups.map(g => [g.code, g.cardCount, g.issues.length])).toEqual([
    ['unknown-card', 2, 2],
    ['unsupported-card', 1, 2],
    ['missing-card', 0, 1],
    ['deck-size', 0, 1],
  ]);
});
