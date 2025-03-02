import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';

export const useGetCollection = (collectionId: string | undefined) => {
  return useQuery<UserCollectionData, ErrorWithStatus>({
    queryKey: ['collection', collectionId],
    queryFn: collectionId
      ? async () => {
          const response = await api.collection[':id'].$get({
            param: {
              id: collectionId,
            },
          });
          if (!response.ok) {
            if (response.status === 404) {
              // Create a custom error with a status property
              const error: ErrorWithStatus = new Error('Collection not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }
          const data = await response.json();
          return data;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: Infinity,
  });
};
