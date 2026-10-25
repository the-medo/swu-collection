import { expect, test } from 'bun:test';
import { areGameAndMatchRecordsEqual, calculateResultStatistics } from './resultStatistics.ts';
import { calculateDeckStatistics } from './deckLib.ts';
import type { MatchResult } from './MatchResult.ts';

const match = (id: string, outcomes: (boolean | null)[], result?: 0 | 1 | 3): MatchResult =>
  ({ id, result, games: outcomes.map(isWinner => ({ isWinner, otherData: {} })) }) as MatchResult;

test('only identical counts and results collapse, including Bo1 draws', () => {
  const matches = [match('win', [true], 3), match('loss', [false], 0), match('draw', [null], 1)];
  for (const stats of [
    calculateResultStatistics(matches),
    calculateDeckStatistics('deck', matches),
  ]) {
    expect(stats).toMatchObject({ totalGames: 3, totalMatches: 3, gameDraws: 1, matchDraws: 1 });
    expect(areGameAndMatchRecordsEqual(stats)).toBe(true);
  }

  expect(areGameAndMatchRecordsEqual(calculateResultStatistics([]))).toBe(true);
  expect(
    areGameAndMatchRecordsEqual(calculateResultStatistics([match('bo3', [true, false, true], 3)])),
  ).toBe(false);
  expect(
    areGameAndMatchRecordsEqual(calculateResultStatistics([match('unfinished', [true])])),
  ).toBe(false);
});

test('a forfeit after one won game keeps the losing match visible', () => {
  const matches = [match('forfeit', [true], 0)];
  for (const stats of [
    calculateResultStatistics(matches),
    calculateDeckStatistics('deck', matches),
  ]) {
    expect(stats).toMatchObject({ totalGames: 1, totalMatches: 1, gameWins: 1, matchLosses: 1 });
    expect(areGameAndMatchRecordsEqual(stats)).toBe(false);
  }
});

test('team results count paired internal matches once without their outcomes', () => {
  const stats = calculateResultStatistics([
    { ...match('inTeam-pair', [true], 3), inTeam: true },
    { ...match('original-pair', [false], 0), inTeam: true },
    match('external', [true, false, true], 3),
  ]);
  expect(stats).toMatchObject({
    totalMatches: 2,
    totalGames: 4,
    matchWins: 1,
    matchLosses: 0,
    matchDraws: 0,
    gameWins: 2,
    gameLosses: 1,
    gameDraws: 0,
    matchWinrate: 50,
    gameWinrate: 50,
    containsInTeam: true,
    containsNotInTeam: true,
  });
  expect(areGameAndMatchRecordsEqual(stats)).toBe(false);
});
