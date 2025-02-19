import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

const PAGE_SIZE = 20;

export type GetCollectionsRequest = {
  wantlist?: boolean;
  country?: string;
  state?: string;
};

export const useGetCollections = ({ wantlist, country, state }: GetCollectionsRequest) => {
  const qk = `public-collections-${wantlist ? '1' : '0'}-${country ?? 'x'}-${state ?? 'x'}`;
  // const qk = `public-collections-${wantlist ? '1' : '0'}`;

  return useInfiniteQuery({
    queryKey: [qk],
    queryFn: async ({ pageParam }) => {
      const response = await api.collection.$get({
        query: {
          wantlist: wantlist,
          country: country ?? undefined,
          state: state ?? undefined,
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
