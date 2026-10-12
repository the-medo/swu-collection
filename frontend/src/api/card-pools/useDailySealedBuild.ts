import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { dailySealedKeys } from './dailySealedKeys.ts';

export function useDailySealedBuild(poolId: string) {
  const session = useSession();
  const userId = session.data?.user.id;
  const enabled = !!userId && !session.isPending && !session.error;
  const query = useQuery({
    queryKey: dailySealedKeys.myBuild(poolId, userId),
    enabled,
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error('Sign in to load your build.');
      const response = await api['card-pools'][':id'].decks.$get(
        {
          param: { id: poolId },
          query: { userId, sort: 'updated_at', order: 'desc', limit: '1', offset: '0' },
        },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load your build');
      return (await response.json()).data[0]?.deck ?? null;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  });

  return {
    build: enabled ? query.data : null,
    isPending: session.isPending || (enabled && query.isPending),
    isError: enabled && query.isError,
    refetch: query.refetch,
  };
}
