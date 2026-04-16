import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendResourceCreateRequest,
  TournamentWeekendResourceMutationResponse,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useCreateTournamentWeekendResource = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendResourceMutationResponse,
    ErrorWithStatus,
    TournamentWeekendResourceCreateRequest
  >({
    mutationFn: async data => {
      const response = await api['tournament-weekends'][':id'].resources.$post({
        param: { id: weekendId },
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to submit tournament weekend resource');
      }

      return response.json() as Promise<TournamentWeekendResourceMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.detail(weekendId) });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.live() });
    },
  });
};
