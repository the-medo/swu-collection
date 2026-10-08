import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userProfileKeys } from './queryKeys.ts';

export function useUserAchievements(userId: string) {
  return useQuery({
    queryKey: userProfileKeys.achievements(userId),
    staleTime: 60_000,
    queryFn: userId
      ? async () => {
          const response = await api.user[':id'].achievements.$get({ param: { id: userId } });
          if (!response.ok) throw await createApiError(response, 'Could not load achievements.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}
