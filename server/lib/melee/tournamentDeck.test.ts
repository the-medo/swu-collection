import { expect, test } from 'bun:test';
import { findTournamentDeck } from './tournamentDeck.ts';

const candidate = {
  id: 'bilbao-deck',
  name: 'Han Solo',
  username: 'Martin Mederly',
  placement: 18,
  visibility: 1,
};

test('matches unique historical placement when the linked username differs', () => {
  expect(findTournamentDeck([candidate], 'SB_Medo', 18)).toEqual({
    id: 'bilbao-deck',
    name: 'Han Solo',
  });
  expect(findTournamentDeck([candidate], 'SB_Medo', 19)).toBeNull();
  expect(findTournamentDeck([candidate], 'SB_Medo', null)).toBeNull();
  expect(findTournamentDeck([{ ...candidate, placement: 0 }], 'SB_Medo', 0)).toBeNull();
});

test('exact username takes precedence and matching is case insensitive', () => {
  const named = { ...candidate, id: 'named', username: 'sb_MEDO', placement: 17 };
  expect(findTournamentDeck([candidate, named], 'SB_Medo', 18)?.id).toBe('named');
  expect(findTournamentDeck([candidate, { ...named, visibility: 0 }], 'SB_Medo', 18)).toBeNull();
});

test('ambiguous placements and private decks never expose another deck', () => {
  expect(
    findTournamentDeck(
      [candidate, { ...candidate, id: 'tied-private', visibility: 0 }],
      'SB_Medo',
      18,
    ),
  ).toBeNull();
  expect(findTournamentDeck([{ ...candidate, visibility: 0 }], 'SB_Medo', 18)).toBeNull();
  expect(
    findTournamentDeck([candidate, { ...candidate, id: 'another-list' }], 'Martin Mederly', 18),
  ).toBeNull();
});
