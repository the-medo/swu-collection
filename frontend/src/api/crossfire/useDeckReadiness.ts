import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
export function useDeckReadiness(sessionId: string, deckId: string | undefined) {
  return useQuery({
    queryKey: crossfireKeys.readiness(sessionId, deckId),
    queryFn: deckId
      ? async ({ signal }) => {
          const response = await api.crossfire.decks[':deckId'].readiness.$get(
            { param: { deckId } },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not check this deck');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
