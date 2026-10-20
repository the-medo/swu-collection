import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';

export function useEditorPool(poolId?: string) {
  return useQuery({
    // The endpoint never grants owner-only access, so this data is viewer-independent.
    queryKey: ['editor-pool', poolId],
    queryFn: poolId
      ? async ({ signal }) => {
          const response = await api['card-pools'][':id'].embed.$get(
            { param: { id: poolId } },
            { init: { signal } },
          );
          if (!response.ok)
            throw await createApiError(response, 'Could not load this sealed pool.');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
