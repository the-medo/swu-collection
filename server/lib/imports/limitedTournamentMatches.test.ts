import { describe, expect, test } from 'bun:test';
import {
  buildLimitedTournamentMatches,
  type LimitedMeleeMatch,
} from './limitedTournamentMatches.ts';

const match = (first: string, second: string | null, result: string): LimitedMeleeMatch => ({
  Competitors: [first, second]
    .filter((name): name is string => name !== null)
    .map(DisplayName => ({
      Team: { Players: [{ DisplayName }] },
    })),
  ResultString: result,
});

describe('limited round results', () => {
  test('preserves orientation and counts pre-round points once, including reversed duplicates', () => {
    const rows = buildLimitedTournamentMatches('event', [
      { number: 2, matches: [match('B', 'A', 'B won 2-1-0')] },
      { number: 1, matches: [match('A', 'B', 'A won 2-0-0'), match('B', 'A', 'A won 2-0-0')] },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ p1DeckId: null, p2DeckId: null, result: 3, gameWin: 2 });
    expect(rows[1]).toMatchObject({
      p1Username: 'B',
      p1Points: 0,
      p2Points: 3,
      gameWin: 2,
      gameLose: 1,
    });
  });

  test('supports byes, draws, named forfeits, and double forfeits', () => {
    const rows = buildLimitedTournamentMatches('event', [
      {
        number: 1,
        matches: [match('A', null, 'A was assigned a bye'), match('B', 'C', '0-0-3 Draw')],
      },
      {
        number: 2,
        matches: [
          match('A', 'B', 'A forfeited the match'),
          match('C', null, 'C was assigned a bye'),
        ],
      },
      { number: 3, matches: [match('B', 'C', 'Players forfeited the match')] },
      { number: 4, matches: [match('B', 'C', 'C won 2-1')] },
    ]);
    expect(rows[0]).toMatchObject({ isBye: true, p2Username: null, p2Points: null, result: 3 });
    expect(rows[1]).toMatchObject({ result: 1, gameDraw: 3 });
    expect(rows[2]).toMatchObject({ p1Points: 3, p2Points: 1, result: 0, gameLose: 2 });
    expect(rows[5]).toMatchObject({ p1Points: 4, p2Points: 4, result: 0, gameWin: 1, gameLose: 2 });
  });

  test('handles names containing " won " and draws with reported game scores', () => {
    const rows = buildLimitedTournamentMatches('event', [
      {
        number: 1,
        matches: [
          match('Dude won the Potato', 'B', 'Dude won the Potato won 2-1-0'),
          {
            Competitors: [
              { Team: { Players: [{ DisplayName: 'C' }] }, GameWins: 1 },
              { Team: { Players: [{ DisplayName: 'D' }] }, GameWins: 1 },
            ],
            ResultString: '1-1-0 Draw',
            GameDraws: 0,
          },
        ],
      },
    ]);
    expect(rows[0]).toMatchObject({ result: 3, gameWin: 2 });
    expect(rows[1]).toMatchObject({ result: 1, gameWin: 1, gameLose: 1, gameDraw: 0 });
  });

  test('refuses unavailable or unrecognized results instead of inventing losses', () => {
    for (const result of ['Not reported', '', 'Unknown won 2-0-0']) {
      expect(() =>
        buildLimitedTournamentMatches('event', [{ number: 1, matches: [match('A', 'B', result)] }]),
      ).toThrow('Unrecognized result');
    }
  });
});
