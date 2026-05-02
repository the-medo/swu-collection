import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { PlayerSearchResponse } from '../../../../types/TournamentWeekend.ts';
import { playerWatchQueryKeys } from './queryKeys';

export const useGetPlayers = (search: string, enabled = true) => {
  const normalizedSearch = search.trim();

  return useQuery<PlayerSearchResponse, ErrorWithStatus>({
    queryKey: playerWatchQueryKeys.players(normalizedSearch),
    queryFn: async () => {
      const response = await api['player-watch'].players.$get({
        query: { search: normalizedSearch },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to search players');
      }

      return response.json() as Promise<PlayerSearchResponse>;
    },
    enabled: enabled && normalizedSearch.length > 0,
    staleTime: 60 * 1000,
  });
};
