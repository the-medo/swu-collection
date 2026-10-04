import type {
  UserMeleeTournament,
  UserMeleeTournamentStats,
} from '../../../shared/types/UserMeleeTournaments.ts';

// tournament_type.major also includes PQ/Open; those have their own achievement category.
export const majorTournamentTypes = new Set(['ma1', 'ma2', 'sq', 'rq', 'gc']);
export const pqOpenTournamentTypes = new Set(['pq', 'open']);

export function tournamentAchievements(input: {
  type: string | null;
  days: number;
  dayTwoPlayerCount: number | null;
  placement: number | null;
  completed: boolean;
}) {
  const major = majorTournamentTypes.has(input.type ?? '');
  const dayTwoEligible = major && input.days > 1;
  const dayTwoCutoffKnown = input.dayTwoPlayerCount !== null && input.dayTwoPlayerCount > 0;
  const ranked = input.completed && input.placement !== null && input.placement > 0;
  return {
    major,
    dayTwoEligible,
    dayTwoCutoffKnown,
    topEight: ranked && pqOpenTournamentTypes.has(input.type ?? '') && input.placement! <= 8,
    dayTwo:
      ranked && dayTwoEligible && dayTwoCutoffKnown && input.placement! <= input.dayTwoPlayerCount!,
  };
}

export function summarizeTournaments(rows: UserMeleeTournament[]): UserMeleeTournamentStats {
  const completed = rows.filter(row => row.completed && row.tournamentId !== null);
  const majors = completed.filter(row => row.major);
  const twoDayMajors = majors.filter(row => row.dayTwoEligible);
  return {
    topEights: completed.filter(row => row.topEight).length,
    pqOpenTotal: completed.filter(row => pqOpenTournamentTypes.has(row.type ?? '')).length,
    dayTwos: twoDayMajors.filter(row => row.dayTwo).length,
    majorTotal: twoDayMajors.length,
    unknownDayTwoCutoffs: twoDayMajors.filter(row => !row.dayTwoCutoffKnown).length,
    bestMajorFinishes: majors
      .filter(row => row.placement !== null && row.placement > 0)
      .sort(
        (a, b) =>
          a.placement! - b.placement! ||
          b.attendance - a.attendance ||
          b.date.localeCompare(a.date) ||
          a.meleeId - b.meleeId,
      )
      .slice(0, 3)
      .map(row => ({
        tournamentId: row.tournamentId!,
        name: row.name,
        placement: row.placement!,
        attendance: row.attendance,
        date: row.date,
      })),
  };
}
