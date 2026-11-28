import { differenceInCalendarWeeks, endOfWeek, startOfWeek } from 'date-fns';
import { TournamentData } from '../../../types/Tournament.ts';
import { WeekData } from '@/components/app/admin/PQToolsPage/types.ts';
import type { TournamentGroupWithMeta } from '../../../types/TournamentGroup.ts';

/**
 * Hook to transform tournament data into weekly divisions
 * @param tournaments Array of tournament data
 * @returns Array of weekly data containing tournaments grouped by week
 */
export function useWeeklyTournaments(
  tournaments: TournamentData[],
  existingGroups: TournamentGroupWithMeta[] = [],
): WeekData[] {
  // Sort tournaments by date
  const sortedTournaments = [...tournaments].sort((a, b) => {
    const dateA = new Date(a.tournament.date);
    const dateB = new Date(b.tournament.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Group tournaments by week
  const weeklyTournaments: WeekData[] = [];

  if (sortedTournaments.length > 0) {
    // A mid-season meta change preserves existing PQ week numbers. Anchor to a
    // known group instead of restarting at Week 1 in the newly selected meta.
    const tournamentIds = new Set(tournaments.map(t => t.tournament.id));
    const anchor = existingGroups
      .flatMap(group => {
        const match = group.group.name.match(/^PQ Week (\d+)$/);
        const member = group.tournaments.find(t => tournamentIds.has(t.tournament.id));
        return match && member
          ? [{ weekNumber: Number(match[1]), date: member.tournament.date }]
          : [];
      })
      .sort((a, b) => a.weekNumber - b.weekNumber)[0];
    const earliestDate = new Date(anchor?.date ?? sortedTournaments[0].tournament.date);
    const firstWeekNumber = anchor?.weekNumber ?? 1;
    // Set to the start of the week (Monday)
    const earliestWeekStart = startOfWeek(earliestDate, { weekStartsOn: 1 });

    // Group tournaments by week
    sortedTournaments.forEach(tournament => {
      const tournamentDate = new Date(tournament.tournament.date);

      // Calculate which week this tournament belongs to
      const weekDiff = differenceInCalendarWeeks(tournamentDate, earliestWeekStart, {
        weekStartsOn: 1,
      });
      const weekNumber = weekDiff + firstWeekNumber;

      // Find or create the week data
      let weekData = weeklyTournaments.find(w => w.weekNumber === weekNumber);

      if (!weekData) {
        // Calculate the start and end of the week
        const weekStart = new Date(earliestWeekStart);
        weekStart.setDate(earliestWeekStart.getDate() + weekDiff * 7);
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
