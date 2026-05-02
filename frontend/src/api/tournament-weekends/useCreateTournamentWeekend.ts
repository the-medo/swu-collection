import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendCreateRequest,
  TournamentWeekendMutationResponse,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useCreateTournamentWeekend = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendMutationResponse,
    ErrorWithStatus,
    TournamentWeekendCreateRequest
  >({
    mutationFn: async data => {
      const response = await api['tournament-weekends'].$post({
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to create tournament weekend');
      }

      return response.json() as Promise<TournamentWeekendMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
