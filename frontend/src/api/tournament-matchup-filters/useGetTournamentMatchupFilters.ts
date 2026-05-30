import { skipToken, useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { SavedTournamentMatchupFilter } from '../../../../types/TournamentMatchupFilters.ts';
import { tournamentMatchupFilterQueryKeys } from './queryKeys';

export interface GetTournamentMatchupFiltersResponse {
  data: SavedTournamentMatchupFilter[];
}

export const useGetTournamentMatchupFilters = (formatId: number | undefined, enabled = true) => {
  return useQuery<GetTournamentMatchupFiltersResponse, ErrorWithStatus>({
    queryKey: tournamentMatchupFilterQueryKeys.list(formatId),
    queryFn:
      enabled && formatId
        ? async () => {
            const response = await api['tournament-matchup-filters'].$get({
              query: {
                format: String(formatId),
              },
            });

            if (!response.ok) {
              throw await createApiError(response, 'Failed to fetch saved matchup filters');
            }

            return response.json() as Promise<GetTournamentMatchupFiltersResponse>;
          }
        : skipToken,
    staleTime: 60 * 1000,
  });
};
