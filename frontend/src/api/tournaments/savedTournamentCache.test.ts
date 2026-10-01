import { expect, test } from 'bun:test';
import { patchSavedTournaments, savedTournamentKeys } from './savedTournamentCache.ts';
import type { SavedTournament } from '../../../../types/UserTournamentSave.ts';

const saved = (id: string, date: string): SavedTournament => ({
  tournamentId: id,
  status: 'saved',
  additionalInfo: {},
  createdAt: '',
  updatedAt: '',
  tournament: {
    id,
    name: id,
    date,
    days: 1,
    type: 'pq',
    format: 1,
    location: 'FR',
    meleeId: null,
    coordinates: null,
    additionalInfo: {},
    updatedAt: '',
  },
});

test('save/status/remove patches retain unrelated events, sort dates, and never mutate the old list', () => {
  const first = saved('first', '2026-10-01');
  const last = saved('last', '2026-11-01');
  const original = [last];
  const added = patchSavedTournaments(original, first.tournamentId, first);
  expect(added).toEqual([first, last]);
  expect(original).toEqual([last]);
  const going = { ...first, status: 'going' as const };
  const changed = patchSavedTournaments(added, first.tournamentId, going);
  expect(changed).toEqual([going, last]);
  expect(added).toEqual([first, last]);
  expect(patchSavedTournaments(changed, first.tournamentId, null)).toEqual([last]);
  expect(patchSavedTournaments(changed, 'missing', null)).toEqual(changed);
});

test('saved lists and mutation locks are separated by account', () => {
  expect(savedTournamentKeys.user('a')).not.toEqual(savedTournamentKeys.user('b'));
  expect(savedTournamentKeys.user()).not.toEqual(savedTournamentKeys.user('a'));
  expect(savedTournamentKeys.mutation('a', 'event')).not.toEqual(
    savedTournamentKeys.mutation('b', 'event'),
  );
});
