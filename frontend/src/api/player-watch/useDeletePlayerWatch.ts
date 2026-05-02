import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { tournamentWeekendQueryKeys } from '@/api/tournament-weekends/queryKeys';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { playerWatchQueryKeys } from './queryKeys';

export const useDeletePlayerWatch = () => {
  const queryClient = useQueryClient();

  return useMutation<boolean, ErrorWithStatus, string>({
    mutationFn: async displayName => {
      const response = await api['player-watch'].$delete({
        query: { displayName },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to remove watched player');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerWatchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
