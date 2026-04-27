import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  TournamentWeekendTournamentMutationResponse,
  TournamentWeekendTournamentUpdateRequest,
} from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export type UpdateTournamentWeekendTournamentVariables = {
  tournamentId: string;
  data: TournamentWeekendTournamentUpdateRequest;
};

export const useUpdateTournamentWeekendTournament = (weekendId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TournamentWeekendTournamentMutationResponse,
    ErrorWithStatus,
    UpdateTournamentWeekendTournamentVariables
  >({
    mutationFn: async ({ tournamentId, data }) => {
      const response = await api['tournament-weekends'][':id'].tournament[':tournamentId'].$patch({
        param: { id: weekendId, tournamentId },
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to update tournament weekend tournament');
      }

      return response.json() as Promise<TournamentWeekendTournamentMutationResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.detail(weekendId) });
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.live() });
    },
  });
};
