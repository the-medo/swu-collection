import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { meleeConnectionKeys } from './queryKeys.ts';
import { userTournamentKeys } from '@/api/user/tournamentKeys.ts';
import { userProfileKeys } from '@/api/user-profile/queryKeys.ts';

type Action = { action: 'start'; username: string } | { action: 'verify' | 'disconnect' };

export function useMeleeConnectionMutation() {
  const user = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Action) => {
      if (!user) throw new Error('Sign in to connect your Melee account.');
      const response =
        input.action === 'start'
          ? await api.integration.melee.challenge.$post({ json: { username: input.username } })
          : input.action === 'verify'
            ? await api.integration.melee.verify.$post()
            : await api.integration.melee.$delete();
      if (!response.ok)
        throw await createApiError(response, 'Could not update your Melee connection.');
      return { data: (await response.json()).data, userId: user.id };
    },
    onSuccess: async ({ data, userId }) => {
      const queryKey = meleeConnectionKeys.status(userId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, data);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: userTournamentKeys.profile(userId) });
      await queryClient.invalidateQueries({ queryKey: userProfileKeys.achievements(userId) });
    },
  });
}
