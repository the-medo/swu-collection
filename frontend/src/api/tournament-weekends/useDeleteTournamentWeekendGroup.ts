import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useDeleteTournamentWeekendGroup = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<boolean, ErrorWithStatus, string>({
    mutationFn: async tournamentGroupId => {
      const response = await api['tournament-weekends'][':id']['tournament-groups'].$delete({
        param: { id: weekendId },
        query: { tournamentGroupId },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to remove tournament group from weekend');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.detail(weekendId) });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.live() });
    },
  });
};
