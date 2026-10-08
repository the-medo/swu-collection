import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { UserAchievementInput } from '../../../../types/UserAchievements.ts';
import { userProfileKeys } from './queryKeys.ts';

export function useUpdateUserAchievement(userId: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserAchievementInput) => {
      if (user?.id !== userId) throw new Error('Only the profile owner can edit achievements.');
      const response = await api.user[':id'].achievements.$patch(
        { param: { id: userId }, json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save achievement.');
      return (await response.json()).data;
    },
    onSuccess: async data => {
      const queryKey = userProfileKeys.achievements(userId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, data);
    },
  });
}
