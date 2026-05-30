import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { tournamentMatchupFilterQueryKeys } from './queryKeys';

export interface DeleteTournamentMatchupFilterRequest {
  id: string;
  formatId: number;
}

export const useDeleteTournamentMatchupFilter = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, ErrorWithStatus, DeleteTournamentMatchupFilterRequest>({
    mutationFn: async ({ id }) => {
      const response = await api['tournament-matchup-filters'][':id'].$delete({
        param: {
          id,
        },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to delete saved matchup filter');
      }

      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tournamentMatchupFilterQueryKeys.list(variables.formatId),
      });
    },
  });
};
