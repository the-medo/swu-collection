import { expect, test } from 'bun:test';
import { useWeeklyTournaments } from './useWeeklyTournaments.ts';
import type { TournamentData } from '../../../types/Tournament.ts';
import type { TournamentGroupWithMeta } from '../../../types/TournamentGroup.ts';

const tournament = (id: string, date: string) =>
  ({
    tournament: {
      id,
      date,
      name: id,
      continent: 'Europe',
      location: 'FR',
    },
  }) as TournamentData;

test('keeps transferred PQ Week numbers, gaps and newly added earlier/later weeks', () => {
  const anchor = tournament('anchor', '2026-11-28');
  const tournaments = [
    anchor,
    tournament('sunday', '2026-11-29'),
    tournament('later', '2026-12-12'),
    tournament('earlier', '2026-11-22'),
  ];
  const group = { group: { name: 'PQ Week 4' }, tournaments: [anchor] } as TournamentGroupWithMeta;
  const weeks = useWeeklyTournaments(tournaments, [group]);
  expect(weeks.map(w => w.weekNumber)).toEqual([3, 4, 6]);
  expect(weeks[1]!.tournaments.map(t => t.tournament.id)).toEqual(['anchor', 'sunday']);
  expect(weeks[1]!.startDate.getDay()).toBe(1);
  expect(weeks[1]!.startDate.getDate()).toBe(23);
});

test('new groups start at Week 1 and unrelated existing groups do not anchor them', () => {
  const tournaments = [tournament('first', '2026-11-28'), tournament('second', '2026-12-05')];
  expect(useWeeklyTournaments(tournaments).map(w => w.weekNumber)).toEqual([1, 2]);
  const group = {
    group: { name: 'PQ Week 9' },
    tournaments: [tournament('unrelated', '2026-11-28')],
  } as TournamentGroupWithMeta;
  expect(useWeeklyTournaments(tournaments, [group]).map(w => w.weekNumber)).toEqual([1, 2]);
});
