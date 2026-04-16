import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendMutationResponse,
  TournamentWeekendUpdateRequest,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export type UpdateTournamentWeekendVariables = {
  id: string;
  data: TournamentWeekendUpdateRequest;
};

export const useUpdateTournamentWeekend = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendMutationResponse,
    ErrorWithStatus,
    UpdateTournamentWeekendVariables
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api['tournament-weekends'][':id'].$patch({
        param: { id },
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to update tournament weekend');
      }

      return response.json() as Promise<TournamentWeekendMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
