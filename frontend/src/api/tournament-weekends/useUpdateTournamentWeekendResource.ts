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

export const useUpdateTournamentWeekendResource = (weekendId?: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendResourceMutationResponse,
    ErrorWithStatus,
    UpdateTournamentWeekendResourceVariables
  >({
    mutationFn: async ({ resourceId, data }) => {
      const response = weekendId
        ? await api['tournament-weekends'][':id'].resources[':resourceId'].$patch({
            param: { id: weekendId, resourceId },
            json: data,
          })
        : await api.admin['resource-submissions'][':resourceId'].$patch({
            param: { resourceId },
            json: data,
          });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to update tournament weekend resource');
      }

      return response.json() as Promise<TournamentWeekendResourceMutationResponse>;
    },
    onSuccess: () => {
      // Resources belong to tournaments, which can appear in several weekends.
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
