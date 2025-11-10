import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CardPoolsQuery } from '../../../../server/routes/card-pools/get.ts';

const PAGE_SIZE = 20;

export type GetCardPoolsRequest = Partial<CardPoolsQuery>;

export const useGetCardPools = (props: GetCardPoolsRequest) => {
  const {
    userId,
    visibility,
    set,
    type,
    sort = 'updated_at',
    order = 'desc',
  } = props ?? {};

  const qk = [
    'card-pools',
    userId ?? 'public',
    {
      visibility,
      set,
      type,
      sort,
      order,
    },
  ];

  return useInfiniteQuery({
    queryKey: qk,
    queryFn: async ({ pageParam }) => {
      const response = await api['card-pools'].$get({
        query: {
          userId,
          visibility,
          set,
          type,
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
      return data as any;
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      if (!lastPage?.data || lastPage.data.length === 0 || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    staleTime: Infinity,
  });
};
