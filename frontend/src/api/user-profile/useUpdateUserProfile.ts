import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { UserProfileFavoritesInput } from '../../../../types/UserProfile.ts';
import { userProfileKeys } from './queryKeys.ts';

export function useUpdateUserProfile(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserProfileFavoritesInput) => {
      const response = await api.user[':id'].profile.$patch(
        { param: { id: userId }, json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save favorites.');
      return (await response.json()).data;
    },
    onSuccess: async data => {
      await queryClient.cancelQueries({ queryKey: userProfileKeys.detail(userId) });
      queryClient.setQueryData(userProfileKeys.detail(userId), data);
    },
  });
}
