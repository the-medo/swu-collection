import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckData } from '../../../../types/Deck.ts';
import { Pagination } from '../../../../types/pagination.ts';

const PAGE_SIZE = 20;

export interface GetCardPoolDecksResponse {
  data: Pick<DeckData, 'deck' | 'user'>[];
  pagination: Pagination;
}

export interface GetCardPoolDecksParams {
  id: string | undefined;
  userId?: string;
  sort?: 'created_at' | 'updated_at' | 'name';
  order?: 'asc' | 'desc';
}

export const useGetCardPoolDecks = (params: GetCardPoolDecksParams) => {
  const { id, userId, sort = 'updated_at', order = 'desc' } = params ?? {};

  const qk = ['card-pool-decks', id, userId ?? 'all', { sort, order }];

  return useInfiniteQuery({
    queryKey: qk,
    queryFn: async ({ pageParam }) => {
      if (!id) throw new Error('Card pool id is required');
      const res = await api['card-pools'][':id'].decks.$get({
        param: { id },
        query: {
          userId,
          sort,
          order,
          limit: PAGE_SIZE.toString(),
          offset: pageParam.toString(),
        },
      });
      if (!res.ok) {
        throw new Error('Something went wrong');
      }
      const data = await res.json();
      return data as GetCardPoolDecksResponse;
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      if (!lastPage?.data || lastPage.data.length === 0 || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    staleTime: Infinity,
    enabled: !!id,
  });
};
