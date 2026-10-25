import { expect, test } from 'bun:test';
import type { MatchResult } from '../lib/MatchResult.ts';
import { completedHistoryMatches, historyOpponents, recentHistoryForm } from './historyInsights.ts';

function match(
  id: string,
  day: number,
  result: 0 | 1 | 3 | undefined,
  extra: Partial<MatchResult> = {},
): MatchResult {
  return {
    id,
    firstGameCreatedAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
    result,
    games: [{ isWinner: result === 3 ? true : result === 0 ? false : null, otherData: {} }],
    ...extra,
  } as MatchResult;
}

test('recent form uses the newest twenty completed external results, in chronological order', () => {
  const records = Array.from({ length: 25 }, (_, i) => match(`${i + 1}`, i + 1, i >= 15 ? 3 : 0));
  const ignored = [
    match('running', 28, undefined),
    match('excluded', 27, 3, { exclude: true }),
    match('internal', 26, 3, { inTeam: true }),
  ];
  const form = recentHistoryForm([...records, ...ignored]);
  expect(form.matches.map(m => m.id)).toEqual(Array.from({ length: 20 }, (_, i) => `${i + 6}`));
  expect(form.stats).toMatchObject({ totalMatches: 20, matchWins: 10, matchLosses: 10 });
  expect(form.trend[9]).toMatchObject({ count: 10, rate: 0 });
  expect(form.trend[10]).toMatchObject({ count: 10, rate: 10 });
  expect(form.trend[19]).toMatchObject({ count: 10, rate: 100 });
  expect(records[0].id).toBe('1');
});

test('draws count in the denominator and Bo3 game records remain distinct from match results', () => {
  const form = recentHistoryForm([
    match('draw', 1, 1),
    match('bo3', 2, 3, {
      games: [true, false, true].map(isWinner => ({
        isWinner,
        otherData: {},
      })) as MatchResult['games'],
    }),
    match('forfeit', 3, 0),
  ]);
  expect(form.stats).toMatchObject({
    totalMatches: 3,
    totalGames: 5,
    matchWins: 1,
    matchLosses: 1,
    matchDraws: 1,
    gameWins: 2,
    gameLosses: 2,
  });
  expect(form.trend.at(-1)?.rate).toBeCloseTo(100 / 3);
});

test('opponents group across bases, keep unknown leaders, and exclude both internal perspectives', () => {
  const records = [
    match('a', 1, 3, { opponentLeaderCardId: 'leader', opponentBaseCardKey: 'base-a' }),
    match('b', 2, 0, { opponentLeaderCardId: 'leader', opponentBaseCardKey: 'base-b' }),
    match('c', 3, 1),
    match('internal', 4, 3, { inTeam: true }),
    match('inTeam-internal', 4, 0, { inTeam: true }),
  ];
  expect(
    historyOpponents(records).map(({ leaderId, stats }) => [
      leaderId,
      stats.totalMatches,
      stats.matchWins,
      stats.matchLosses,
    ]),
  ).toEqual([
    ['leader', 2, 1, 1],
    ['', 1, 0, 0],
  ]);
  expect(completedHistoryMatches(records)).toHaveLength(3);
  expect(recentHistoryForm([])).toMatchObject({ matches: [], trend: [] });
});
