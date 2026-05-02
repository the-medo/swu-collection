import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { TournamentWeekendListResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useGetTournamentWeekends = () => {
  return useQuery<TournamentWeekendListResponse, ErrorWithStatus>({
    queryKey: tournamentWeekendQueryKeys.list(),
    queryFn: async () => {
      const response = await api['tournament-weekends'].$get();

      if (!response.ok) {
        throw await createApiError(response, 'Failed to fetch tournament weekends');
      }

      return response.json() as Promise<TournamentWeekendListResponse>;
    },
    staleTime: 60 * 1000,
  });
};
