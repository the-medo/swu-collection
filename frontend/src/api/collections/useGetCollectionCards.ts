import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';

export interface CollectionCardResponse {
  data: CollectionCard[];
}

export const useGetCollectionCards = (collectionId: string | undefined, skip: boolean = false) => {
  return useQuery<CollectionCardResponse>({
    queryKey: ['collection-content', collectionId],
    queryFn:
      collectionId && !skip
        ? async () => {
            console.log('Getting collection content', collectionId);
            const response = await api.collection[':id'].card.$get({
              param: {
                id: collectionId,
              },
            });
            if (!response.ok) {
              throw new Error('Something went wrong');
            }
            return await response.json();
          }
        : skipToken,
    staleTime: Infinity,
  });
};
