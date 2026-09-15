import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { CrossfireDeckSource } from '../../../../shared/types/crossfire-decks.ts';
import { crossfireKeys } from './queryKeys.ts';

export function useCrossfireDecks(
  sessionId: string,
  source: CrossfireDeckSource,
  search: string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: [...crossfireKeys.session(sessionId), 'decks', source, search],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const response = await api.crossfire.decks.$get(
        { query: { source, search, cursor: pageParam } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load decks');
      return response.json();
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 60_000,
  });
}

export function useCrossfireDeck(sessionId: string, deckId: string | undefined) {
  return useQuery({
    queryKey: [...crossfireKeys.session(sessionId), 'deck', deckId],
    queryFn: deckId
      ? async ({ signal }) => {
          const response = await api.crossfire.decks[':deckId'].$get(
            { param: { deckId } },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not load this deck');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}
