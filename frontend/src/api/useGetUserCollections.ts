import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useGetUserCollections = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['collections', userId],
    queryFn: userId
      ? async () => {
          const response = await api.user[':id'].collection.$get({
            param: {
              id: userId,
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
