import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { createApiError } from '@/api/errors';
import { walletKeys } from './queryKeys';

export function useUserTransactions(userId: string, page: number) {
  const owner = useUser();
  return useQuery({
    queryKey: walletKeys.transactions(userId, page),
    staleTime: 0,
    gcTime: 0,
    queryFn:
      owner?.id === userId
        ? async () => {
            const response = await api.user[':id'].transactions.$get({
              param: { id: userId },
              query: { page: String(page) },
            });
            if (!response.ok)
              throw await createApiError(response, 'Could not load your transactions.');
            return (await response.json()).data;
          }
        : skipToken,
  });
}
