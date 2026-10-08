import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { createApiError } from '@/api/errors';
import { walletKeys } from './queryKeys';

export function useUserWallet(userId: string) {
  const owner = useUser();
  return useQuery({
    queryKey: walletKeys.balance(userId),
    staleTime: 0,
    gcTime: 0,
    queryFn:
      owner?.id === userId
        ? async () => {
            const response = await api.user[':id'].wallet.$get({ param: { id: userId } });
            if (!response.ok) throw await createApiError(response, 'Could not load your balances.');
            return (await response.json()).data;
          }
        : skipToken,
  });
}
