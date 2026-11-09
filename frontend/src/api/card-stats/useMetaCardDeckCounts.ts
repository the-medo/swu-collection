import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { cardStatsKeys } from './queryKeys.ts';

export function useMetaCardDeckCounts(metaId: number | undefined) {
  return useQuery({
    queryKey: cardStatsKeys.metaDeckCounts(metaId),
    queryFn:
      metaId !== undefined
        ? async () => {
            const response = await api['card-stats']['deck-counts'].$get({
              query: { meta_id: String(metaId) },
            });
            if (!response.ok)
              throw await createApiError(response, 'Failed to load meta deck counts');
            return response.json();
          }
        : skipToken,
    staleTime: 5 * 60 * 1000,
  });
}
