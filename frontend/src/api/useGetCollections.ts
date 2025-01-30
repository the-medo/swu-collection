import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

const PAGE_SIZE = 20;

export const useGetCollections = (wantlist: boolean = false) => {
  return useInfiniteQuery({
    queryKey: ['public-collections'],
    queryFn: async ({ pageParam }) => {
      const response = await api.collection.$get({
        query: {
          wantlist: wantlist,
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
