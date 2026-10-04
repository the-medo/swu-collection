import { expect, test } from 'bun:test';
import { summarizeTournaments, tournamentAchievements } from './tournamentStats.ts';
import type { UserMeleeTournament } from '../../../shared/types/UserMeleeTournaments.ts';

function row(
  type: string | null,
  placement: number | null,
  overrides: Partial<UserMeleeTournament> = {},
): UserMeleeTournament {
  return {
    meleeId: 1,
    tournamentId: 'matched',
    name: 'Event',
    type,
    typeName: type,
    date: '2026-01-01',
    format: 'Premier',
    attendance: 100,
    placement,
    record: null,
    completed: true,
    ...tournamentAchievements({ type, placement, days: 2, dayTwoPlayerCount: 32, completed: true }),
    deck: null,
    meleeDecklistId: null,
    meleeDecklistName: null,
    ...overrides,
  };
}
test('highlights exact cutoffs; zero, unknown, unfinished and one-day results do not advance', () => {
  const base = { type: 'sq', days: 2, dayTwoPlayerCount: 32, placement: 32, completed: true };
  expect(tournamentAchievements(base).dayTwo).toBe(true);
  for (const override of [
    { placement: 33 },
    { placement: 0 },
    { placement: null },
    { days: 1 },
    { dayTwoPlayerCount: null },
    { dayTwoPlayerCount: 0 },
    { completed: false },
  ]) {
    expect(tournamentAchievements({ ...base, ...override }).dayTwo).toBe(false);
  }
  expect(tournamentAchievements({ ...base, type: 'pq', placement: 8 }).topEight).toBe(true);
  expect(tournamentAchievements({ ...base, type: 'open', placement: 9 }).topEight).toBe(false);
});
test('PQ/Open and major stats stay separate; best finishes omit unmatched/in-progress events', () => {
  const stats = summarizeTournaments([
    row('pq', 1),
    row('open', 8),
    row('pq', 10),
    row('sq', 1),
    row('rq', 2),
    row('gc', 3),
    row('sq', 4),
    row('sq', null, { dayTwoCutoffKnown: false }),
    row('ma1', 1, { dayTwoEligible: false, dayTwo: false }),
    row('sq', 1, { tournamentId: null }),
    row('pq', 1, { completed: false }),
    row('local', 1),
  ]);
  expect(stats).toEqual({
    topEights: 2,
    pqOpenTotal: 3,
    dayTwos: 4,
    majorTotal: 5,
    unknownDayTwoCutoffs: 1,
    bestMajorFinishes: [1, 1, 2].map(placement => ({
      tournamentId: 'matched',
      name: 'Event',
      placement,
      attendance: 100,
      date: '2026-01-01',
    })),
  });
});

test('best major finishes show the lowest placements and break ties by larger attendance', () => {
  const stats = summarizeTournaments([
    row('sq', 18, { attendance: 676 }),
    row('rq', 9, { attendance: 560 }),
    row('gc', 53, { attendance: 543 }),
    row('sq', 9, { attendance: 400 }),
    row('sq', 0),
    row('sq', null),
    row('pq', 1),
    row('open', 1),
  ]);
  expect(
    stats.bestMajorFinishes.map(({ placement, attendance }) => [placement, attendance]),
  ).toEqual([
    [9, 560],
    [9, 400],
    [18, 676],
  ]);
  expect(summarizeTournaments([]).bestMajorFinishes).toEqual([]);
  expect(summarizeTournaments([row('rq', 9)]).bestMajorFinishes).toHaveLength(1);
});
