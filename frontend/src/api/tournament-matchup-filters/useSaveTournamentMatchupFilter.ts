import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  SavedTournamentMatchupFilter,
  SavedTournamentMatchupFilterCreateRequest,
} from '../../../../types/TournamentMatchupFilters.ts';
import { tournamentMatchupFilterQueryKeys } from './queryKeys';

export interface SaveTournamentMatchupFilterResponse {
  data: SavedTournamentMatchupFilter;
}

export const useSaveTournamentMatchupFilter = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SaveTournamentMatchupFilterResponse,
    ErrorWithStatus,
    SavedTournamentMatchupFilterCreateRequest
  >({
    mutationFn: async data => {
      const response = await api['tournament-matchup-filters'].$post({
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to save matchup filter');
      }

      return response.json() as Promise<SaveTournamentMatchupFilterResponse>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tournamentMatchupFilterQueryKeys.list(variables.format),
      });
    },
  });
};
