import { differenceInWeeks, endOfWeek, startOfWeek } from 'date-fns';
import { TournamentData } from '../../../types/Tournament.ts';
import { WeekData } from '@/components/app/admin/PQToolsPage/types.ts';

/**
 * Hook to transform tournament data into weekly divisions
 * @param tournaments Array of tournament data
 * @returns Array of weekly data containing tournaments grouped by week
 */
export function useWeeklyTournaments(tournaments: TournamentData[]): WeekData[] {
  // Sort tournaments by date
  const sortedTournaments = [...tournaments].sort((a, b) => {
    const dateA = new Date(a.tournament.date);
    const dateB = new Date(b.tournament.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Group tournaments by week
  const weeklyTournaments: WeekData[] = [];

  if (sortedTournaments.length > 0) {
    // Find the earliest tournament date to mark as "week 1"
    const earliestDate = new Date(sortedTournaments[0].tournament.date);
    // Set to the start of the week (Monday)
    const earliestWeekStart = startOfWeek(earliestDate, { weekStartsOn: 1 });

    // Group tournaments by week
    sortedTournaments.forEach(tournament => {
      const tournamentDate = new Date(tournament.tournament.date);

      // Calculate which week this tournament belongs to
      const weekDiff = differenceInWeeks(tournamentDate, earliestWeekStart);
      const weekNumber = weekDiff + 1;

      // Find or create the week data
      let weekData = weeklyTournaments.find(w => w.weekNumber === weekNumber);

      if (!weekData) {
        // Calculate the start and end of the week
        const weekStart = new Date(earliestWeekStart);
        weekStart.setDate(earliestWeekStart.getDate() + (weekNumber - 1) * 7);
        const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
        const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });

        weekData = {
          weekNumber,
          startDate: weekStartDate,
          endDate: weekEndDate,
          tournaments: [],
        };
        weeklyTournaments.push(weekData);
      }

      weekData.tournaments.push(tournament);
    });

    // Sort tournaments within each week by continent, location, date, name
    weeklyTournaments.forEach(week => {
      week.tournaments.sort((a, b) => {
        // 1. Sort by continent
        if (a.tournament.continent !== b.tournament.continent) {
          return a.tournament.continent.localeCompare(b.tournament.continent);
        }

        // 2. Sort by location
        if (a.tournament.location !== b.tournament.location) {
          return a.tournament.location.localeCompare(b.tournament.location);
        }

        // 3. Sort by date
        const dateA = new Date(a.tournament.date);
        const dateB = new Date(b.tournament.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }

        // 4. Sort by name
        return a.tournament.name.localeCompare(b.tournament.name);
      });
    });
  }

  return weeklyTournaments;
}
