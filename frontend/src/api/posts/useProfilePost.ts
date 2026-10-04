import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { PostDocument } from '../../../../shared/posts/content.ts';

export const profilePostKey = (userId: string) => ['posts', 'profile-description', userId] as const;
export async function getProfilePost(userId: string) {
  const response = await api.posts.profile[':userId'].$get({ param: { userId } });
  if (!response.ok) throw await createApiError(response, 'Could not load this bio.');
  return (await response.json()).data;
}
export function useProfilePost(userId: string) {
  return useQuery({ queryKey: profilePostKey(userId), queryFn: () => getProfilePost(userId) });
}
export function useSaveProfilePost(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (json: { content: PostDocument; revision: number | null }) => {
      const response = await api.posts.profile[':userId'].$put({ param: { userId }, json });
      if (!response.ok) throw await createApiError(response, 'Could not save your bio.');
      return (await response.json()).data;
    },
    onSuccess: data => {
      client.setQueryData(profilePostKey(userId), data);
    },
    onSettled: () => client.invalidateQueries({ queryKey: profilePostKey(userId) }),
  });
}
