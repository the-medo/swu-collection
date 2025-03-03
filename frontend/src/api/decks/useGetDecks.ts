import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

const PAGE_SIZE = 20;

export type GetDecksRequest = {
  format?: number;
  leaders?: string;
  base?: string;
  sort?: string;
};

export const useGetDecks = (props: GetDecksRequest) => {
  const qk = `public-decks-${JSON.stringify(props)}`;
  const { format, leaders, base, sort } = props;
  // const qk = `public-collections-${wantlist ? '1' : '0'}`;

  return useInfiniteQuery({
    queryKey: [qk],
    queryFn: async ({ pageParam }) => {
      const response = await api.deck.$get({
        query: {
          format,
          leaders,
          base,
          sort,
          top: PAGE_SIZE,
          offset: pageParam * PAGE_SIZE,
        },
      });
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const data = await response.json();
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length === 0) {
        return undefined;
      }
      return lastPageParam + 1;
    },
    staleTime: Infinity,
  });
};
