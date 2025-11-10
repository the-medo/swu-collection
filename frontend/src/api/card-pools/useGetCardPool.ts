import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { CardPool } from '../../../../server/db/schema/card_pool.ts';

export interface CardPoolDataResponse {
  data: CardPool;
}

export const useGetCardPool = (id: string | undefined) => {
  return useQuery<CardPoolDataResponse, ErrorWithStatus>({
    queryKey: ['card-pool', id],
    queryFn: id
      ? async () => {
          const res = await api['card-pools'][':id'].$get({ param: { id } });
          if (!res.ok) {
            if (res.status === 404) {
              const error: ErrorWithStatus = new Error('Card pool not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }
          return (await res.json()) as CardPoolDataResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: Infinity,
  });
};
