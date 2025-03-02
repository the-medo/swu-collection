import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';

export interface CollectionCardResponse {
  data: CollectionCard[];
}

export const useGetCollectionCards = (collectionId: string | undefined) => {
  return useQuery<CollectionCardResponse>({
    queryKey: ['collection-content', collectionId],
    queryFn: collectionId
      ? async () => {
          const response = await api.collection[':id'].card.$get({
            param: {
              id: collectionId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          const data = await response.json();
          return data;
        }
      : skipToken,
    staleTime: Infinity,
  });
};
