import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { UserCollectionsResponse } from '../../../../server/routes/user.ts';
import { queryClient } from '@/queryClient.ts';

export const useGetUserCollections = (
  userId: string | undefined,
  includeEntityPrices: boolean = false,
) => {
  return useQuery({
    queryKey: ['collections', userId, { includeEntityPrices }],
    queryFn: userId
      ? async () => {
          const response = await api.user[':id'].collection.$get({
            param: {
              id: userId,
            },
            query: {
              includeEntityPrices,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          const data = (await response.json()) as unknown as UserCollectionsResponse;
          return data;
        }
      : skipToken,
    staleTime: Infinity,
  });
};

export const updateGetUserCollections = (
  userId: string,
  updateCallback: (
    data: UserCollectionsResponse | undefined,
  ) => UserCollectionsResponse | undefined,
) => {
  queryClient.setQueriesData<UserCollectionsResponse | undefined>(
    { queryKey: ['collections', userId] },
    (oldData: UserCollectionsResponse | undefined) => {
      return updateCallback(oldData);
    },
  );
};
