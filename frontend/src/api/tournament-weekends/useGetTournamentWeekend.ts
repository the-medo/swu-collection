import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { TournamentWeekendDetailResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useGetTournamentWeekend = (id?: string, enabled = true) => {
  return useQuery<TournamentWeekendDetailResponse, ErrorWithStatus>({
    queryKey: tournamentWeekendQueryKeys.detail(id),
    queryFn: async () => {
      if (!id) {
        throw new Error('Tournament weekend id is required');
      }

      const response = await api['tournament-weekends'][':id'].$get({
        param: { id },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to fetch tournament weekend');
      }

      return response.json() as Promise<TournamentWeekendDetailResponse>;
    },
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
  });
};
