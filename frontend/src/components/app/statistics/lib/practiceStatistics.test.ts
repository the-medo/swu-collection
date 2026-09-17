import { expect, test } from 'bun:test';
import type { GameResult } from '../../../../../../server/db/schema/game_result.ts';
import { isPracticeResult } from '../../../../../../shared/lib/statisticsScope.ts';
import { summarizeMatch } from './summarizeMatch.ts';
import { calculateDeckStatistics } from './deckLib.ts';
import { transformMetricsToTableData } from '../components/SubpageCardStats/cardStatLib.ts';

function game(id: string, practice = true): GameResult {
  return {
    userId: 'alice',
    id,
    gameId: id,
    gameSource: 'crossfire',
    statisticsScope: practice ? 'practice' : 'standard',
    createdAt: '2026-09-16 12:00:00',
    isWinner: true,
    cardMetrics: { marine: { played: 1 }, undrawn: {} },
    otherData: {
      crossfire: {
        version: 1,
        lobbyId: id,
        resumed: practice,
        match: {
          bestOf: 1,
          status: 'complete',
          outcome: 'win',
          reason: 'score',
          wins: 1,
          losses: 0,
        },
        totals: {
          actions: 2,
          attacks: 0,
          played: 1,
          activated: 0,
          drawn: 0,
          discarded: 0,
          resourced: 0,
          playResourcesSpent: 2,
        },
      },
    },
  };
}

test('bookmark forks are excluded before building history, match and card statistics', () => {
  const rows = [game('fresh', false), ...Array.from({ length: 5 }, (_, i) => game(`fork-${i}`))];
  const standard = rows.filter(row => !isPracticeResult(row));
  const matches = standard.map(row => ({
    id: row.gameId,
    gameSource: row.gameSource,
    format: '',
    exclude: false,
    manuallyEdited: false,
    firstGameCreatedAt: row.createdAt!,
    games: [row],
    ...summarizeMatch([row]),
  }));
  expect(standard).toHaveLength(1);
  expect(matches).toHaveLength(1);
  expect(calculateDeckStatistics('deck', matches)).toMatchObject({ gameWins: 1, matchWins: 1 });
  expect(
    transformMetricsToTableData(standard).find(card => card.cardId === 'marine'),
  ).toMatchObject({ included: 1, played: 1 });
});

test('legacy cached and sanitized practice rows stay excluded, fresh rematches count normally', () => {
  const legacy = game('legacy');
  delete legacy.statisticsScope;
  const sanitized = { ...game('sanitized'), otherData: {} };
  expect([game('opening'), legacy, sanitized].every(isPracticeResult)).toBe(true);
  expect(isPracticeResult(game('rematch', false))).toBe(false);
  expect(isPracticeResult({ ...game('manual', false), gameSource: 'manual', otherData: {} })).toBe(
    false,
  );
});
