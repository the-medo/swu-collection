import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { tournamentWeekendQueryKeys } from '@/api/tournament-weekends/queryKeys';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  PlayerWatchMutationRequest,
  PlayerWatchMutationResponse,
} from '../../../../types/TournamentWeekend.ts';
import { playerWatchQueryKeys } from './queryKeys';

export const usePostPlayerWatch = () => {
  const queryClient = useQueryClient();

  return useMutation<PlayerWatchMutationResponse, ErrorWithStatus, PlayerWatchMutationRequest>({
    mutationFn: async data => {
      const response = await api['player-watch'].$post({
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to add watched player');
      }

      return response.json() as Promise<PlayerWatchMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerWatchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
