import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { authClient } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { calendarSharingKeys } from '@/api/tournaments/calendarSharingKeys.ts';
import type { UserAvatarInput } from '../../../../types/UserAvatar.ts';

export function useSetUserAvatar(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserAvatarInput) => {
      const response = await api.user.avatar.$post(
        { json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save your avatar.');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      // Better Auth owns the nav avatar; these queries embed public user images.
      authClient.$store.notify('$sessionSignal');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', userId] }),
        queryClient.invalidateQueries({ queryKey: ['team-members'] }),
        queryClient.invalidateQueries({ queryKey: ['team-join-requests'] }),
        queryClient.invalidateQueries({ queryKey: calendarSharingKeys.all }),
      ]);
    },
  });
}
