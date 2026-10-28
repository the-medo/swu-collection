import { expect, test } from 'bun:test';
import { BracketInfo } from '../../../../../../types/enums.ts';
import type { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { buildBracket } from './buildBracket.ts';

const match = (round: number, first: string, second: string, result = 3): TournamentMatch => ({
  id: `${round}-${first}`,
  tournamentId: 'event',
  round,
  p1Username: first,
  p2Username: second,
  p1DeckId: null,
  p2DeckId: null,
  p1Points: 0,
  p2Points: 0,
  result,
  gameWin: result === 3 ? 2 : 1,
  gameLose: result === 3 ? 1 : 2,
  gameDraw: 0,
  isBye: false,
});

test('builds a deckless top-eight bracket in advancement order with player-two winners', () => {
  const matches = [
    match(9, 'G', 'H'),
    match(9, 'E', 'F'),
    match(9, 'C', 'D', 0),
    match(9, 'A', 'B'),
    match(10, 'E', 'G', 0),
    match(10, 'A', 'D'),
    match(11, 'A', 'G', 0),
    match(8, 'Swiss', 'Other'),
  ];
  const bracket = buildBracket(matches, [], BracketInfo.TOP8)!;
  expect(bracket.map(round => round.length)).toEqual([4, 2, 1]);
  expect(bracket[0].map(row => row.p1Username)).toEqual(['A', 'C', 'E', 'G']);
  expect(bracket[1].map(row => row.p1Username)).toEqual(['A', 'E']);
  expect(bracket[2][0]).toMatchObject({
    p1Username: 'A',
    p2Username: 'G',
    player1: null,
    player2: null,
    gameWins: 1,
    gameLosses: 2,
  });
});

test('retains available constructed deck references and supports missing opponent decks', () => {
  const deck: TournamentDeckResponse = {
    deck: null,
    deckInformation: null,
    tournamentDeck: {
      tournamentId: 'event',
      deckId: 'deck-a',
      meleePlayerUsername: 'A',
      meleeDecklistGuid: 'melee-a',
      placement: 1,
      topRelativeToPlayerCount: false,
      recordWin: 5,
      recordLose: 0,
      recordDraw: 0,
      points: 15,
    },
  };
  const bracket = buildBracket([match(9, 'A', 'B')], [deck], BracketInfo.TOP4)!;
  expect(bracket[1][0].player1).toBe(deck);
  expect(bracket[1][0].player2).toBeNull();
  expect(bracket[1][0].p2Username).toBe('B');
});

test('does not invent a bracket for no-cut events or empty results', () => {
  expect(buildBracket([match(1, 'A', 'B')], [], BracketInfo.NONE)).toBeNull();
  expect(buildBracket([], [], BracketInfo.TOP8)).toBeNull();
});

test('keeps legacy constructed forfeit winners while limited double forfeits have no winner', () => {
  const zeroScore = { ...match(9, 'A', 'B', 0), gameWin: 0, gameLose: 0 };
  expect(buildBracket([zeroScore], [], BracketInfo.TOP4)![1][0].winnerUsername).toBe('B');
  expect(buildBracket([zeroScore], [], BracketInfo.TOP4, true)![1][0].winnerUsername).toBeNull();
  expect(
    buildBracket([{ ...zeroScore, gameLose: 2 }], [], BracketInfo.TOP4, true)![1][0].winnerUsername,
  ).toBe('B');
});
