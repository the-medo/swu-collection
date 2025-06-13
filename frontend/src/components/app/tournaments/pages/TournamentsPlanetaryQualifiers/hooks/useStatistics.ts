import { useMemo } from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup';
import { isFuture } from 'date-fns';

/**
 * Interface for the statistics returned by the hook
 */
interface TournamentStatistics {
  totalTournaments: number;
  importedTournaments: number;
  upcomingTournaments: number;
}

/**
 * Hook to calculate tournament statistics from tournament groups
 * @param tournamentGroups - Array of tournament groups with metadata
 * @returns Object containing totalTournaments, importedTournaments, and upcomingTournaments
 */
export const useStatistics = (tournamentGroups: TournamentGroupWithMeta[]): TournamentStatistics => {
  return useMemo(() => {
    const allTournaments = tournamentGroups.flatMap(group =>
      group.tournaments.map(t => t.tournament),
    );

    const totalTournaments = allTournaments.length;
    const importedTournaments = allTournaments.filter(t => t.imported).length;
    const upcomingTournaments = allTournaments.filter(t => isFuture(new Date(t.date))).length;

    return {
      totalTournaments,
      importedTournaments,
      upcomingTournaments,
    };
  }, [tournamentGroups]);
};