import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { LiveTournamentWeekendResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export type UseLiveTournamentWeekendOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

export const useLiveTournamentWeekend = (options: UseLiveTournamentWeekendOptions = {}) => {
  const { enabled = true, refetchInterval = false } = options;

  return useQuery<LiveTournamentWeekendResponse, ErrorWithStatus>({
    queryKey: tournamentWeekendQueryKeys.live(),
    queryFn: async () => {
      const response = await api['tournament-weekends'].live.$get();

      if (!response.ok) {
        throw await createApiError(response, 'Failed to fetch live tournament weekend');
      }

      return response.json() as Promise<LiveTournamentWeekendResponse>;
    },
    enabled,
    refetchInterval,
    staleTime: 30 * 1000,
  });
};
