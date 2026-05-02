import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendResourceMutationResponse,
  TournamentWeekendResourceUpdateRequest,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export type UpdateTournamentWeekendResourceVariables = {
  resourceId: string;
  data: TournamentWeekendResourceUpdateRequest;
};

export const useUpdateTournamentWeekendResource = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendResourceMutationResponse,
    ErrorWithStatus,
    UpdateTournamentWeekendResourceVariables
  >({
    mutationFn: async ({ resourceId, data }) => {
      const response = await api['tournament-weekends'][':id'].resources[':resourceId'].$patch({
        param: { id: weekendId, resourceId },
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to update tournament weekend resource');
      }

      return response.json() as Promise<TournamentWeekendResourceMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.detail(weekendId) });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.live() });
      queryClient.invalidateQueries({
        queryKey: tournamentWeekendQueryKeys.resourceList(weekendId),
      });
    },
  });
};
