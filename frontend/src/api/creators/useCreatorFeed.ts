import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { hubApi } from './client.ts';
import { creatorKeys } from './keys.ts';
import type { DiscoveryQuery, DiscoveryResult } from '../../../../shared/creators/contracts.ts';

export function useCreatorFeed(query: Partial<DiscoveryQuery>, enabled: boolean) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: creatorKeys.infiniteDiscovery(query),
    queryFn: ({ pageParam }) => hubApi.discover({ ...query, page: pageParam, limit: 6 }),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, page) => (last.hasMore && page < 1000 ? page + 1 : undefined),
    // Keep results and facets in place while filters load, so the page does not
    // collapse and clamp its scroll position. Never carry another creator's feed.
    placeholderData: (previous, previousQuery) => {
      if (!enabled || !query.creatorId) return undefined;
      if (previousQuery?.queryKey[4].creatorId === query.creatorId) return previous;
      // All content and media tabs mount separate route components. Reuse the
      // newest feed for this creator when a new observer has no previous data.
      const cached = queryClient
        .getQueryCache()
        .findAll({
          queryKey: creatorKeys.infiniteDiscoveries,
          predicate: candidate => {
            const filters = candidate.queryKey[4] as Partial<DiscoveryQuery> | undefined;
            return filters?.creatorId === query.creatorId && candidate.state.data !== undefined;
          },
        })
        .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0];
      return cached
        ? queryClient.getQueryData<InfiniteData<DiscoveryResult, number>>(cached.queryKey)
        : undefined;
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreatorDecks(id: string) {
  return useInfiniteQuery({
    queryKey: creatorKeys.decks(id),
    queryFn: ({ pageParam }) => hubApi.decks(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, page) => (last.hasMore && page < 1000 ? page + 1 : undefined),
    staleTime: 0,
    retry: 1,
  });
}
