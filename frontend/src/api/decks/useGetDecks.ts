import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckQueryParams } from '../../../../server/routes/decks/get.ts';
import { createApiError } from '@/api/errors.ts';
import { useSession } from '@/lib/auth-client.ts';

const PAGE_SIZE = 20;

export type GetDecksRequest = Partial<DeckQueryParams>;

type DeckListPage = {
  data?: readonly unknown[];
  pagination?: { hasMore?: boolean };
};

export const getNextDecksPageParam = (
  lastPage: DeckListPage,
  allPages: readonly DeckListPage[],
) => {
  if (!lastPage.data?.length || !lastPage.pagination?.hasMore) return undefined;

  // A successful deletion updates cached pages in place, so their row count is
  // the authoritative offset for the next request.
  return allPages.reduce((offset, page) => offset + (page.data?.length ?? 0), 0);
};

type DeckListOptions = {
  enabled?: boolean;
  sessionScoped?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | 'always';
};

export const useGetDecks = (props: GetDecksRequest, options: DeckListOptions = {}) => {
  const {
    userId,
    excludeUserId,
    folderId,
    sharedFolderId,
    favorite,
    following,
    format,
    leaders,
    base,
    baseAspect,
    aspects,
    sort = 'deck.updated_at',
    order = 'desc',
    limit = PAGE_SIZE,
  } = props;
  const session = useSession();
  const viewer = session.data?.user;

  // Create a stable query key based on all filter parameters
  const qk = [
    'decks',
    favorite ? 'favorite' : 'all',
    {
      userId,
      excludeUserId,
      folderId,
      sharedFolderId,
      following,
      ...(sharedFolderId || options.sessionScoped || following
        ? { viewerId: viewer?.id ?? 'anonymous' }
        : {}),
      format,
      leaders,
      base,
      baseAspect,
      aspects,
      sort,
      order,
      limit,
    },
  ];

  return useInfiniteQuery({
    queryKey: qk,
    enabled:
      options.enabled !== false &&
      (!following || !!viewer) &&
      (!sharedFolderId || !session.isPending) &&
      (!options.sessionScoped || (!session.isPending && !session.error)),
    queryFn: async ({ pageParam, signal }) => {
      const leadersParam = Array.isArray(leaders) ? leaders.join(',') : leaders;
      const aspectsParam = aspects && aspects.length > 0 ? aspects.join(',') : undefined;

      const response = await api.deck.$get(
        {
          query: {
            userId,
            excludeUserId,
            folderId,
            sharedFolderId,
            favorite: favorite ? 'true' : undefined,
            following: following ? 'true' : undefined,
            format: format?.toString(),
            leaders: leadersParam,
            base,
            baseAspect,
            aspects: aspectsParam,
            sort,
            order,
            limit: limit.toString(),
            offset: pageParam.toString(),
          },
        },
        { init: { signal } },
      );

      if (!response.ok) {
        throw await createApiError(response, 'Failed to load decks');
      }

      const data = await response.json();
      return data; // Return the full response with data and pagination info
    },
    initialPageParam: 0,
    getNextPageParam: getNextDecksPageParam,
    staleTime: options.staleTime ?? (sharedFolderId || following ? 0 : Infinity),
    gcTime: following ? 0 : undefined,
    refetchOnMount: options.refetchOnMount,
    refetchInterval: sharedFolderId ? 30_000 : false,
  });
};
