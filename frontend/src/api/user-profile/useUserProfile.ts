import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userProfileKeys } from './queryKeys.ts';

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: userProfileKeys.detail(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await api.user[':id'].profile.$get({ param: { id: userId } });
      if (!response.ok) throw await createApiError(response, 'Could not load favorites.');
      return (await response.json()).data;
    },
  });
}
