import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useGetCollection = (collectionId: string | undefined) => {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: collectionId
      ? async () => {
          const response = await api.collection[':id'].$get({
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
