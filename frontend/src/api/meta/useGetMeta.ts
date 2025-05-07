import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { type MetaData } from './useGetMetas.ts';

export interface MetaResponse {
  data: MetaData;
}

export const useGetMeta = (metaId: number | undefined) => {
  return useQuery<MetaResponse, ErrorWithStatus>({
    queryKey: ['meta', metaId],
    queryFn: metaId
      ? async () => {
          const response = await api.meta[':id'].$get({
            param: {
              id: metaId.toString(),
            },
          });
          if (!response.ok) {
            if (response.status === 404) {
              // Create a custom error with a status property
              const error: ErrorWithStatus = new Error('Meta not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }
          const data = await response.json();
          return data as MetaResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: Infinity,
  });
};