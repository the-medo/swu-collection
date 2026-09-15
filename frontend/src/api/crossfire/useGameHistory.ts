import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
export function useGameHistory(sessionId: string, status?: 'running') {
  return useInfiniteQuery({
    queryKey: [...crossfireKeys.session(sessionId), 'history', status],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const response = await api.crossfire.history.$get(
        { query: { cursor: pageParam, status } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load your games');
      return response.json();
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchInterval: query =>
      query.state.data?.pages.some(page => page.data.some(game => game.exit?.status === 'pending'))
        ? 3000
        : false,
    gcTime: 0,
  });
}
