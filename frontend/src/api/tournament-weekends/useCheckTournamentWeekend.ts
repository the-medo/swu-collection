import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { TournamentWeekendCheckResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useCheckTournamentWeekend = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<TournamentWeekendCheckResponse, ErrorWithStatus>({
    mutationFn: async () => {
      const response = await api['tournament-weekends'][':id'].check.$post({
        param: { id: weekendId },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to run live tournament checks');
      }

      return response.json() as Promise<TournamentWeekendCheckResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
