import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckQueryParams } from '../../../../server/routes/decks/get.ts';

const PAGE_SIZE = 20;

export type GetDecksRequest = Partial<DeckQueryParams>;

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
    {
      userId,
      favorite,
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
          favorite,
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
    getNextPageParam: lastPage => {
      // Check if there are more pages to fetch
      if (!lastPage.data || lastPage.data.length === 0 || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      // Return the next offset
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    staleTime: Infinity,
  });
};
