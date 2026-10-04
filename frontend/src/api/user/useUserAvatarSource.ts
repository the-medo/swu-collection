import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';

export const userAvatarSourceKey = (userId: string) => ['user-avatar-source', userId] as const;

export function useUserAvatarSource(userId: string) {
  return useQuery({
    queryKey: userAvatarSourceKey(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await api.user.avatar.$get();
      if (!response.ok) throw await createApiError(response, 'Could not load your avatar source.');
      return (await response.json()).data;
    },
  });
}
