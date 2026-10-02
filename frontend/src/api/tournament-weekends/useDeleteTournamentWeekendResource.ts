import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useDeleteTournamentWeekendResource = (weekendId?: string) => {
  const queryClient = useQueryClient();

  return useMutation<boolean, ErrorWithStatus, string>({
    mutationFn: async resourceId => {
      const response = weekendId
        ? await api['tournament-weekends'][':id'].resources[':resourceId'].$delete({
            param: { id: weekendId, resourceId },
          })
        : await api.admin['resource-submissions'][':resourceId'].$delete({ param: { resourceId } });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to delete tournament weekend resource');
      }

      return true;
    },
    onSuccess: () => {
      // Resources belong to tournaments, which can appear in several weekends.
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.all });
    },
  });
};
