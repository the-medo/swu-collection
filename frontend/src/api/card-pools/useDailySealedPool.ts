import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { dailySealedKeys } from './dailySealedKeys.ts';
import type { DailySealedResponse } from '../../../../shared/types/dailySealed.ts';

export function useDailySealedPool(date?: string) {
  return useQuery({
    queryKey: dailySealedKeys.byDate(date),
    queryFn: async ({ signal }): Promise<DailySealedResponse> => {
      const response = await api['card-pools'].daily.$get(
        { query: { date } },
        { init: { signal } },
      );
      if (!response.ok)
        throw await createApiError(response, 'Could not load the daily sealed pool');
      return (await response.json()).data;
    },
    // Opening today's (or the fallback's) dated discussion must keep this same
    // pool mounted while its explicit-date query loads.
    placeholderData: previous => (date && previous?.pool?.date === date ? previous : undefined),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    retry: 1,
  });
}
