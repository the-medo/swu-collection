import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentMatch } from '../../../../server/db/schema/tournament_match.ts';
import { useGetTournament } from './useGetTournament.ts';
import { getStoredTournamentMatches, isDataStale, storeTournamentMatches } from '@/lib/db.ts';

export interface TournamentMatchesResponse {
  data: TournamentMatch[];
}

export const useGetTournamentMatches = (tournamentId: string | undefined) => {
  const { data: tournamentData } = useGetTournament(tournamentId);
  const tournamentUpdatedAt = tournamentData?.tournament?.updatedAt;

  return useQuery<TournamentMatchesResponse>({
    queryKey: ['tournament-matches', tournamentId],
    queryFn:
      tournamentId && tournamentUpdatedAt
        ? async () => {
            // Try to get cached data first
            const cachedData = await getStoredTournamentMatches(tournamentId);

            // Check if we have valid cached data that's not stale
            if (
              cachedData &&
              tournamentUpdatedAt &&
              !isDataStale(cachedData.fetchedAt, tournamentUpdatedAt)
            ) {
              console.log('Using cached tournament matches data');
              return { data: cachedData.matches };
            }

            const response = await api.tournament[':id']['matches'].$get({
              param: {
                id: tournamentId,
              },
            });
            if (!response.ok) {
              throw new Error('Something went wrong');
            }

            const newData = await response.json();

            // Cache the new data
            await storeTournamentMatches(tournamentId, newData.data);

            return newData;
          }
        : skipToken,
    staleTime: Infinity,
  });
};
