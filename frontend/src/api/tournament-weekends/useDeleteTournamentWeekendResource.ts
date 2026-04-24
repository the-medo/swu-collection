import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useDeleteTournamentWeekendResource = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<boolean, ErrorWithStatus, string>({
    mutationFn: async resourceId => {
      const response = await api['tournament-weekends'][':id'].resources[':resourceId'].$delete({
        param: { id: weekendId, resourceId },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to delete tournament weekend resource');
      }

      return true;
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
