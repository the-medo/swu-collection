import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { cardGroupKeys } from './queryKeys.ts';

export function useCardGroupFeed() {
  return useInfiniteQuery({
    queryKey: cardGroupKeys.feed,
    queryFn: async ({ pageParam, signal }) => {
      const response = await api['card-groups'].feed.$get(
        { query: { cursor: pageParam } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load card groups.');
      return response.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: 1,
  });
}
