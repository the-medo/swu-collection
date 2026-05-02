import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { PlayerWatchListResponse } from '../../../../types/TournamentWeekend.ts';
import { playerWatchQueryKeys } from './queryKeys';

export const useGetPlayerWatch = (enabled = true) => {
  return useQuery<PlayerWatchListResponse, ErrorWithStatus>({
    queryKey: playerWatchQueryKeys.list(),
    queryFn: async () => {
      const response = await api['player-watch'].$get();

      if (!response.ok) {
        throw await createApiError(response, 'Failed to fetch watched players');
      }

      return response.json() as Promise<PlayerWatchListResponse>;
    },
    enabled,
    staleTime: 60 * 1000,
  });
};
