import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { TournamentWeekendMutationResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useRefreshTournamentWeekendTournaments = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<TournamentWeekendMutationResponse, ErrorWithStatus>({
    mutationFn: async () => {
      const response = await api['tournament-weekends'][':id']['refresh-tournaments'].$post({
        param: { id: weekendId },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to refresh weekend tournaments');
      }

      return response.json() as Promise<TournamentWeekendMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
