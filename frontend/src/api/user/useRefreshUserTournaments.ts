import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { userTournamentKeys } from './tournamentKeys.ts';
import { userProfileKeys } from '@/api/user-profile/queryKeys.ts';

export function useRefreshUserTournaments(userId: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (user?.id !== userId) throw new Error('Only the profile owner can refresh tournaments.');
      const response = await api.user[':id'].tournaments.refresh.$post({ param: { id: userId } });
      if (!response.ok) throw await createApiError(response, 'Could not refresh tournaments.');
      return (await response.json()).data;
    },
    onSuccess: async data => {
      const queryKey = userTournamentKeys.profile(userId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, data);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: userProfileKeys.achievements(userId) });
    },
    onError: async () => {
      // A failed upstream attempt still starts the server's refresh cooldown.
      await queryClient.invalidateQueries({ queryKey: userTournamentKeys.profile(userId) });
    },
  });
}
