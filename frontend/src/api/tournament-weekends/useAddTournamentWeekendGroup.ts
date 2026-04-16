import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendGroupCreateRequest,
  TournamentWeekendGroupMutationResponse,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useAddTournamentWeekendGroup = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendGroupMutationResponse,
    ErrorWithStatus,
    TournamentWeekendGroupCreateRequest
  >({
    mutationFn: async data => {
      const response = await api['tournament-weekends'][':id']['tournament-groups'].$post({
        param: { id: weekendId },
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to add tournament group to weekend');
      }

      return response.json() as Promise<TournamentWeekendGroupMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.detail(weekendId) });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.live() });
    },
  });
};
