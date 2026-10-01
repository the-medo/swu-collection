import { expect, test } from 'bun:test';
import { calendarAgendaEvents, calendarEventsByDate } from './calendarData.ts';
import type { SavedTournament } from '../../../../../../types/UserTournamentSave.ts';

const event = (id: string, date: string, days: number): SavedTournament => ({
  tournamentId: id,
  status: 'going',
  additionalInfo: {},
  createdAt: '',
  updatedAt: '',
  tournament: {
    id,
    name: id,
    date,
    days,
    type: 'pq',
    format: 1,
    location: 'FR',
    meleeId: null,
    coordinates: null,
    additionalInfo: {},
    updatedAt: '',
  },
});

test('calendar includes every event day across months and years, including missing coordinates', () => {
  const multi = event('multi', '2026-12-31', 3);
  const single = event('single', '2027-01-01', 1);
  const days = calendarEventsByDate([multi, single], '2026-12-28', '2027-02-07');
  expect([...days.keys()]).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
  expect(days.get('2027-01-01')?.map(row => row.tournamentId)).toEqual(['multi', 'single']);
  expect(days.get('2027-01-02')).toEqual([multi]);
});

test('calendar clips long events to the visible grid and excludes events outside it', () => {
  const long = event('long', '2026-10-01', 100);
  const days = calendarEventsByDate(
    [long, event('past', '2026-09-01', 1), event('future', '2027-03-01', 1)],
    '2026-11-01',
    '2026-11-30',
  );
  expect(days.size).toBe(30);
  expect(days.get('2026-11-01')).toEqual([long]);
  expect(days.get('2026-11-30')).toEqual([long]);
  expect(calendarEventsByDate([], '2026-11-01', '2026-11-30').size).toBe(0);
});

test('agenda lists each overlapping event once in chronological order without changing the cache', () => {
  const rows = [
    event('later', '2027-01-31', 3),
    event('same-day-z', '2027-01-05', 1),
    event('ongoing', '2026-12-31', 3),
    event('same-day-a', '2027-01-05', 1),
    event('past', '2026-12-29', 3),
    event('future', '2027-02-01', 1),
  ];
  const original = rows.map(row => row.tournamentId);
  expect(
    calendarAgendaEvents(rows, '2027-01-01', '2027-01-31').map(row => row.tournamentId),
  ).toEqual(['ongoing', 'same-day-a', 'same-day-z', 'later']);
  expect(rows.map(row => row.tournamentId)).toEqual(original);
  expect(calendarAgendaEvents([], '2027-01-01', '2027-01-31')).toEqual([]);
});
