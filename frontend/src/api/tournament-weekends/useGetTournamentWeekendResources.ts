import { skipToken, useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendResourceListResponse,
  TournamentWeekendResourceListStatus,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useGetTournamentWeekendResources = (
  weekendId?: string,
  status: TournamentWeekendResourceListStatus = 'all',
  enabled = true,
) => {
  return useQuery<TournamentWeekendResourceListResponse, ErrorWithStatus>({
    queryKey: tournamentWeekendQueryKeys.resources(weekendId, status),
    queryFn:
      weekendId && enabled
        ? async () => {
            const response = await api['tournament-weekends'][':id'].resources.$get({
              param: { id: weekendId },
              query: { status },
            });

            if (!response.ok) {
              throw await createApiError(
                response,
                'Failed to fetch tournament weekend resources',
              );
            }

            return response.json() as Promise<TournamentWeekendResourceListResponse>;
          }
        : skipToken,
    staleTime: 30 * 1000,
  });
};
