import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CollectionType } from '../../../../types/enums.ts';

const PAGE_SIZE = 20;

export type GetCollectionsRequest = {
  collectionType?: CollectionType;
  country?: string;
  state?: string;
  includeEntityPrices?: boolean;
};

export const useGetCollections = ({
  collectionType,
  country,
  state,
  includeEntityPrices,
}: GetCollectionsRequest) => {
  const qk = `public-collections-${collectionType}-${country ?? 'x'}-${state ?? 'x'}`;

  return useInfiniteQuery({
    queryKey: [qk],
    queryFn: async ({ pageParam }) => {
      const response = await api.collection.$get({
        query: {
          collectionType: collectionType,
          country: country ?? undefined,
          state: state ?? undefined,
          top: PAGE_SIZE,
          offset: pageParam * PAGE_SIZE,
          includeEntityPrices,
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
