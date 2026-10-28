import { describe, expect, test } from 'bun:test';
import type { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import { BracketInfo } from '../../../../../../types/enums.ts';
import { buildBracket, placementLabel, roundName, winnerUsername } from './bracketModel';

const match = (
  id: string,
  round: number,
  p1Username: string,
  p2Username: string | null,
  result = 3,
): TournamentMatch => ({
  id,
  round,
  p1Username,
  p2Username,
  result,
  tournamentId: 'tournament',
  p1DeckId: 'deck-1',
  p2DeckId: 'deck-2',
  p1Points: 0,
  p2Points: 0,
  gameWin: result === 3 ? 2 : 1,
  gameLose: result === 0 ? 2 : 0,
  gameDraw: 0,
  isBye: false,
});

describe('completed tournament brackets', () => {
  test('orders shuffled matches by advancement, including player-two winners, and excludes Swiss', () => {
    const bracket = buildBracket(
      [
        match('q4', 7, 'G', 'H', 0),
        match('s2', 8, 'E', 'H', 0),
        match('q2', 7, 'C', 'D'),
        match('final', 9, 'A', 'H'),
        match('swiss', 6, 'A', 'Z'),
        match('q3', 7, 'E', 'F'),
        match('s1', 8, 'A', 'C'),
        match('q1', 7, 'A', 'B'),
      ],
      [],
      BracketInfo.TOP8,
    );
    expect(bracket.map(round => round.map(entry => entry.match.id))).toEqual([
      ['q1', 'q2', 'q3', 'q4'],
      ['s1', 's2'],
      ['final'],
    ]);
    expect(winnerUsername(bracket[0][3])).toBe('H');
    // Missing deck metadata must not erase player identity or the recorded result.
    expect(bracket[0][3].player2).toBeNull();
    expect(bracket[0][3].match.p2Username).toBe('H');
  });

  test('keeps recorded draws and scores without inventing a winner', () => {
    const drawn = { ...match('draw', 1, 'A', 'B', 1), gameWin: 1, gameLose: 1, gameDraw: 1 };
    const bracket = buildBracket([drawn], [], BracketInfo.TOP4);
    expect(bracket[0]).toEqual([]);
    expect(bracket[1][0].match).toEqual(drawn);
    expect(winnerUsername(bracket[1][0])).toBeNull();
  });

  test('preserves limited double forfeits without changing constructed winners', () => {
    const forfeit = {
      ...match('forfeit', 9, 'A', 'B', 0),
      p1DeckId: null,
      p2DeckId: null,
      gameWin: 0,
      gameLose: 0,
    };
    const limited = buildBracket([forfeit], [], BracketInfo.TOP4, true);
    expect(winnerUsername(limited[1][0])).toBeNull();
    expect(limited[1][0].match.p1Username).toBe('A');
    expect(winnerUsername(buildBracket([forfeit], [], BracketInfo.TOP4)[1][0])).toBe('B');
  });

  test('leaves absent rounds empty and omits byes', () => {
    const bracket = buildBracket(
      [match('final', 9, 'A', 'B'), { ...match('bye', 8, 'A', null), isBye: true }],
      [],
      BracketInfo.TOP16,
    );
    expect(bracket.map(round => round.length)).toEqual([0, 0, 0, 1]);
    expect(bracket.map((_, index) => roundName(index, bracket.length))).toEqual([
      'Round of 16',
      'Quarterfinals',
      'Semifinals',
      'Final',
    ]);
  });

  test('does not create matches for an empty dataset or a tournament without top cut', () => {
    expect(buildBracket([], [], BracketInfo.TOP8)).toEqual([]);
    expect(buildBracket([match('swiss', 1, 'A', 'B')], [], BracketInfo.NONE)).toEqual([]);
  });

  test('uses actual placements rather than array order for finish labels', () => {
    expect([1, 2, 3, 4, 8, 16, null].map(placementLabel)).toEqual([
      'Champion',
      'Finalist',
      'Top 4',
      'Top 4',
      'Top 8',
      'Top 16',
      'Unplaced',
    ]);
  });
});
