import { useMemo } from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup';
import { isFuture } from 'date-fns';

export interface ProcessedTournamentGroup extends TournamentGroupWithMeta {
  weekNumber: number;
  description: string;
  isMostRecent: boolean;
  isUpcoming: boolean;
}

/**
 * Hook to process tournament groups with additional metadata
 * @param tournamentGroups - Array of tournament groups with metadata
 * @returns Array of processed tournament groups with additional metadata
 */
export const useProcessedTournamentGroups = (
  tournamentGroups: TournamentGroupWithMeta[],
): ProcessedTournamentGroup[] => {
  return useMemo(() => {
    // Find the most recent tournament date that is not in the future
    let mostRecentDate = new Date(0); // Initialize with earliest possible date
    let mostRecentGroupIndex = -1;

    // First pass: find the most recent tournament date
    tournamentGroups.forEach((group, index) => {
      group.tournaments.forEach(t => {
        const tournamentDate = new Date(t.tournament.date);
        // If the tournament is not in the future and is more recent than our current most recent
        if (!isFuture(tournamentDate) && tournamentDate > mostRecentDate) {
          mostRecentDate = tournamentDate;
          mostRecentGroupIndex = index;
        }
      });
    });

    return tournamentGroups.map((group, index) => {
      // Check if all tournaments in this group are in the future
      const isUpcoming = group.tournaments.every(t => isFuture(new Date(t.tournament.date)));

      // Determine if this is the most recent group
      const isMostRecent = index === mostRecentGroupIndex;

      // Get the week number from the group or generate one
      const weekNumber = index + 1; // Assuming sequential weeks

      // Generate a description for the group
      // This could be based on dates, tournament names, etc.
      const description = group.group.description || `Tournament Group ${index + 1}`;

      return {
        ...group,
        weekNumber,
        description,
        isMostRecent,
        isUpcoming,
      };
    });
  }, [tournamentGroups]);
};
