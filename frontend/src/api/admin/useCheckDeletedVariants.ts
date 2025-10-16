import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export type DeletedVariantsMap = Record<string, Record<string, boolean>>;

export interface CheckDeletedVariantsResponse {
  message: string;
  data: DeletedVariantsMap;
}

/**
 * Fetches non-existing variants map aggregated from DB tables and filtered by current card list.
 * Admin-only endpoint.
 */
export const useCheckDeletedVariants = (): UseQueryResult<CheckDeletedVariantsResponse, ErrorWithStatus> => {
  return useQuery<CheckDeletedVariantsResponse, ErrorWithStatus>({
    queryKey: ['admin', 'variant-checker', 'check-deleted-variants'],
    queryFn: async () => {
      const response = await api.admin['variant-checker']['check-deleted-variants'].$get();

      if (!response.ok) {
        if (response.status === 401) {
          const error: ErrorWithStatus = new Error('Unauthorized');
          error.status = 401;
          throw error;
        }
        if (response.status === 403) {
          const error: ErrorWithStatus = new Error('Forbidden');
          error.status = 403;
          throw error;
        }
        const error: ErrorWithStatus = new Error('Failed to fetch deleted variants map');
        error.status = response.status as any;
        throw error;
      }

      const data = (await response.json()) as CheckDeletedVariantsResponse;
      return data;
    },
    staleTime: 0,
  });
};
