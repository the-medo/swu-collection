import { expect, test } from 'bun:test';
import type { TournamentMatch } from '../../db/schema/tournament_match.ts';
import { reportRounds } from './reportRounds.ts';

const match = (overrides: Partial<TournamentMatch> = {}): TournamentMatch => ({
  id: 'match',
  tournamentId: 'event',
  round: 1,
  p1Username: 'Author',
  p1DeckId: 'own',
  p1Points: 0,
  p2Username: 'Opponent',
  p2DeckId: 'opponent',
  p2Points: 0,
  gameWin: 2,
  gameLose: 1,
  gameDraw: 0,
  result: 3,
  isBye: false,
  ...overrides,
});
test('orients both player positions, orders rounds and accumulates the match record', () => {
  const rounds = reportRounds(
    [
      match({ round: 3, result: 1, gameWin: 1, gameLose: 1 }),
      match({
        round: 2,
        p1Username: 'Second opponent',
        p2Username: 'Author',
        p1DeckId: 'other',
        p2DeckId: 'own',
      }),
      match(),
    ],
    'own',
    new Map(),
  );
  expect(rounds.map(row => row.outcome)).toEqual(['win', 'loss', 'draw']);
  expect(rounds[1]!.opponentName).toBe('Second opponent');
  expect(rounds[1]!.games).toEqual({ wins: 1, losses: 2, draws: 0 });
  expect(rounds.map(row => row.record)).toEqual([
    { wins: 1, losses: 0, draws: 0 },
    { wins: 1, losses: 1, draws: 0 },
    { wins: 1, losses: 1, draws: 1 },
  ]);
});
test('a bye counts as a match win without fabricating a game score or opponent', () => {
  const [round] = reportRounds(
    [match({ isBye: true, result: 0, gameWin: 0, gameLose: 0 })],
    'own',
    new Map(),
  );
  expect(round).toMatchObject({
    outcome: 'bye',
    opponentName: null,
    opponentDeck: null,
    games: null,
    record: { wins: 1, losses: 0, draws: 0 },
  });
});
test('unknown results and missing early rounds do not produce a misleading cumulative record', () => {
  const unknown = reportRounds(
    [match({ result: 0, gameWin: 0, gameLose: 0 }), match({ round: 2 })],
    'own',
    new Map(),
  );
  expect(unknown[0]).toMatchObject({ outcome: 'unknown', games: null, record: null });
  expect(unknown[1]!.record).toBeNull();
  const partial = reportRounds(
    [match(), match({ round: 3 }), match({ round: 4 })],
    'own',
    new Map(),
  );
  expect(partial.map(row => row.record)).toEqual([{ wins: 1, losses: 0, draws: 0 }, null, null]);
  expect(reportRounds([match({ round: 5 })], 'own', new Map())[0]!.record).toBeNull();
});
test('unspecified draws have a match result but no invented 0–0–3 game score', () => {
  expect(
    reportRounds([match({ result: 1, gameWin: 0, gameLose: 0, gameDraw: 3 })], 'own', new Map())[0],
  ).toMatchObject({ outcome: 'draw', games: null, record: { wins: 0, losses: 0, draws: 1 } });
});
test('deduplicates mirrored rows and leaves conflicting rounds unresolved', () => {
  const mirror = match({
    p1Username: 'Opponent',
    p2Username: 'Author',
    p1DeckId: 'opponent',
    p2DeckId: 'own',
    gameWin: 1,
    gameLose: 2,
    result: 0,
  });
  const rounds = reportRounds([match(), mirror, match({ round: 2 })], 'own', new Map());
  expect(rounds).toHaveLength(2);
  expect(rounds[1]!.record).toEqual({ wins: 2, losses: 0, draws: 0 });
  expect(
    reportRounds([match(), match({ gameWin: 0, result: 0 })], 'own', new Map())[0],
  ).toMatchObject({ outcome: 'unknown', record: null });
  expect(reportRounds([match()], 'unrelated', new Map())).toEqual([]);
});

test('mirrored names may differ; use the author-facing name and keep the running record', () => {
  const mirror = match({
    p1Username: 'Old display name',
    p2Username: 'Author',
    p1DeckId: 'opponent',
    p2DeckId: 'own',
    gameWin: 1,
    gameLose: 2,
    result: 0,
  });
  const rounds = reportRounds(
    [mirror, match({ p2Username: 'Current display name' }), match({ round: 2 })],
    'own',
    new Map(),
  );
  expect(rounds).toHaveLength(2);
  expect(rounds[0]).toMatchObject({
    opponentName: 'Current display name',
    outcome: 'win',
    record: { wins: 1, losses: 0, draws: 0 },
  });
  expect(rounds[1]!.record).toEqual({ wins: 2, losses: 0, draws: 0 });
  const conflicting = reportRounds(
    [match(), match({ p2DeckId: 'different-private-deck' })],
    'own',
    new Map(),
  );
  expect(conflicting[0]).toMatchObject({ outcome: 'unknown', record: null });
});

test('a mirrored row can supply the opponent deck missing from an older author-facing import', () => {
  const opponent = {
    id: 'opponent',
    name: 'Opponent deck',
    leaderId: 'leader',
    baseId: 'base',
    hasDecklist: true,
  };
  const mirror = match({
    p1Username: 'Renamed opponent',
    p2Username: 'Author',
    p1DeckId: 'opponent',
    p2DeckId: 'own',
    gameWin: 1,
    gameLose: 2,
    result: 0,
  });
  const rounds = reportRounds(
    [mirror, match({ p2Username: 'Historic opponent', p2DeckId: null }), match({ round: 2 })],
    'own',
    new Map([['opponent', opponent]]),
  );
  expect(rounds[0]).toMatchObject({
    opponentName: 'Historic opponent',
    opponentDeck: opponent,
    outcome: 'win',
    record: { wins: 1, losses: 0, draws: 0 },
  });
  expect(rounds[1]!.record).toEqual({ wins: 2, losses: 0, draws: 0 });
});
