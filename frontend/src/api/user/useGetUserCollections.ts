import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { UserCollectionsResponse } from '../../../../server/routes/user.ts';
import { queryClient } from '@/queryClient.ts';

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
  queryClient.setQueryData<UserCollectionsResponse | undefined>(
    ['collections', userId],
    (oldData: UserCollectionsResponse | undefined) => {
      return updateCallback(oldData);
    },
  );
};
