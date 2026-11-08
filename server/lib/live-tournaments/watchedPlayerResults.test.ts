import { expect, test } from 'bun:test';
import { compareWatchedMatches, summarizeWatchedMatch } from './watchedPlayerResults.ts';
import type { TournamentWeekendMatch } from '../../db/schema/tournament_weekend.ts';

const match: Omit<TournamentWeekendMatch, 'id'> = {
  tournamentId: 'event',
  roundNumber: 2,
  matchKey: 'match-2',
  playerDisplayName1: 'Ari',
  playerDisplayName2: 'Mara',
  player1GameWin: 2,
  player2GameWin: 1,
  createdAt: '2026-11-08T10:00:00Z',
  updatedAt: '2026-11-08T10:30:00Z',
};

test('scores and outcomes follow the watched player on either side', () => {
  expect(summarizeWatchedMatch('Ari', match)).toMatchObject({
    outcome: 'win',
    playerGameWins: 2,
    opponentGameWins: 1,
    opponentDisplayName: 'Mara',
  });
  expect(summarizeWatchedMatch('Mara', match)).toMatchObject({
    outcome: 'loss',
    playerGameWins: 1,
    opponentGameWins: 2,
    opponentDisplayName: 'Ari',
  });
});

test('unreported scores stay pending, including 0–0; confirmed ties are draws', () => {
  expect(summarizeWatchedMatch('Ari', { ...match, updatedAt: null }).outcome).toBeNull();
  expect(
    summarizeWatchedMatch('Ari', {
      ...match,
      player1GameWin: 0,
      player2GameWin: 0,
      updatedAt: null,
    }).outcome,
  ).toBeNull();
  expect(
    summarizeWatchedMatch('Ari', { ...match, player1GameWin: 0, player2GameWin: 0 }).outcome,
  ).toBe('draw');
  expect(summarizeWatchedMatch('Ari', { ...match, player2GameWin: null }).outcome).toBeNull();
});

test('byes do not need an opponent score or result timestamp', () => {
  expect(
    summarizeWatchedMatch('Ari', {
      ...match,
      playerDisplayName2: null,
      player2GameWin: null,
      updatedAt: null,
    }).outcome,
  ).toBe('bye');
});

test('round order takes precedence over late corrections to older rounds', () => {
  const early = summarizeWatchedMatch('Ari', {
    ...match,
    roundNumber: 1,
    updatedAt: '2026-11-08T12:00:00Z',
  });
  const late = summarizeWatchedMatch('Ari', match);
  expect([late, early].sort(compareWatchedMatches).map(row => row.roundNumber)).toEqual([1, 2]);
});
