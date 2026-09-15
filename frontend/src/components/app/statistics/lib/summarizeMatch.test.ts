import { expect, test } from 'bun:test';
import { summarizeMatch } from './summarizeMatch.ts';
import { calculateDeckStatistics } from './deckLib.ts';
import type { GameResult } from '../../../../../../server/db/schema/game_result.ts';
import type { CrossfireMatchStatistics } from '../../../../../../shared/types/crossfire-statistics.ts';
import type { MatchResult } from './MatchResult.ts';

const game = (winner: boolean | null, match?: Partial<CrossfireMatchStatistics>): GameResult => ({
  userId: 'player',
  gameId: 'game',
  gameSource: match ? 'crossfire' : 'manual',
  isWinner: winner,
  cardMetrics: {},
  updatedAt: '2026-09-14T12:00:00Z',
  otherData: match
    ? {
        crossfire: {
          version: 1,
          lobbyId: 'lobby',
          resumed: false,
          totals: {
            actions: 0,
            attacks: 0,
            played: 0,
            activated: 0,
            drawn: 0,
            discarded: 0,
            resourced: 0,
            playResourcesSpent: 0,
          },
          match: {
            bestOf: 3,
            status: 'in-progress',
            outcome: null,
            reason: null,
            wins: 1,
            losses: 0,
            ...match,
          },
        },
      }
    : {},
});

test('one saved BO3 game stays in progress and does not lower deck match winrate', () => {
  const games = [game(true, {})],
    summary = summarizeMatch(games);
  expect(summary).toMatchObject({
    type: 'Bo3',
    status: 'in-progress',
    finalWins: 1,
    result: undefined,
  });
  const matches = [
    { id: 'one', games: [game(true)], ...summarizeMatch([game(true)]) },
    { id: 'two', games, ...summary },
  ] as MatchResult[];
  expect(calculateDeckStatistics('deck', matches)).toMatchObject({
    matchWins: 1,
    matchLosses: 0,
    matchWinrate: 100,
    gameWins: 2,
    gameLosses: 0,
  });
});

test('explicit BO3 and forfeit outcome override game count and temporary lead', () => {
  const forfeited = game(true, { status: 'complete', outcome: 'loss', reason: 'forfeit' });
  expect(summarizeMatch([forfeited])).toMatchObject({
    type: 'Bo3',
    result: 0,
    finalWins: 1,
    finalLosses: 0,
    completionReason: 'forfeit',
  });
  const rows = [null, true, false, true].map(w =>
    game(w, { status: 'complete', outcome: 'win', reason: 'score', wins: 2, losses: 1 }),
  );
  expect(summarizeMatch(rows)).toMatchObject({
    type: 'Bo3',
    result: 3,
    finalWins: 2,
    finalLosses: 1,
  });
});

test('latest match metadata replaces a cached intermediate outcome; unrelated sources keep their behavior', () => {
  const old = game(true, {}),
    latest = game(false, {
      status: 'complete',
      outcome: 'win',
      reason: 'score',
      wins: 2,
      losses: 1,
    });
  latest.updatedAt = '2026-09-14T12:01:00Z';
  expect(summarizeMatch([old, latest])).toMatchObject({ result: 3, status: 'complete' });
  expect(summarizeMatch([game(true)])).toMatchObject({ type: 'Bo1', result: 3 });
  expect(summarizeMatch([game(true), game(false)])).toMatchObject({ type: 'Bo3', result: 1 });
  expect(summarizeMatch([game(null)])).toMatchObject({ type: 'Bo1', result: 1 });
});
