import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { TournamentData } from '../../../../types/Tournament.ts';

export const useGetTournament = (tournamentId: string | undefined) => {
  return useQuery<TournamentData, ErrorWithStatus>({
    queryKey: ['tournament', tournamentId],
    queryFn: tournamentId
      ? async () => {
          const response = await api.tournament[':id'].$get({
            param: {
              id: tournamentId,
            },
          });
          if (!response.ok) {
            if (response.status === 404) {
              // Create a custom error with a status property
              const error: ErrorWithStatus = new Error('Tournament not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }
          const data = await response.json();
          return data;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: Infinity,
  });
};
