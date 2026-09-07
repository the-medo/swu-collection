import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckQueryParams } from '../../../../server/routes/decks/get.ts';

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

export const useGetDecks = (props: GetDecksRequest) => {
  const {
    userId,
    favorite,
    format,
    leaders,
    base,
    baseAspect,
    aspects,
    sort = 'deck.updated_at',
    order = 'desc',
  } = props;

  // Create a stable query key based on all filter parameters
  const qk = [
    'decks',
    favorite ? 'favorite' : 'all',
    {
      userId,
      format,
      leaders,
      base,
      baseAspect,
      aspects,
      sort,
      order,
    },
  ];

  return useInfiniteQuery({
    queryKey: qk,
    queryFn: async ({ pageParam }) => {
      const leadersParam = Array.isArray(leaders) ? leaders.join(',') : leaders;
      const aspectsParam = aspects && aspects.length > 0 ? aspects.join(',') : undefined;

      const response = await api.deck.$get({
        query: {
          userId,
          favorite: favorite ? 'true' : undefined,
          format: format?.toString(),
          leaders: leadersParam,
          base,
          baseAspect,
          aspects: aspectsParam,
          sort,
          order,
          limit: PAGE_SIZE.toString(),
          offset: pageParam.toString(),
        },
      });

      if (!response.ok) {
        throw new Error('Something went wrong');
      }

      const data = await response.json();
      return data; // Return the full response with data and pagination info
    },
    initialPageParam: 0,
    getNextPageParam: getNextDecksPageParam,
    staleTime: Infinity,
  });
};
