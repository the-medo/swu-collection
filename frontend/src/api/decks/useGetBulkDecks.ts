import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { deckKeys } from './queryKeys.ts';
import type { DeckData } from '../../../../types/Deck.ts';
import type { DecksBulkResponse } from '../../../../server/routes/decks/bulk.ts';
import { isSharedPrivateDeck, resetDeniedDeckAccess } from './deckAccessCache.ts';

export const useGetBulkDecks = (deckIds: string[] | undefined) => {
  const queryClient = useQueryClient();
  const session = useSession();
  const viewer = session.data?.user;
  const needsAccessCheck = () =>
    (deckIds ?? []).some(id =>
      isSharedPrivateDeck(
        queryClient.getQueryData<DeckData>(deckKeys.detail(id, viewer?.id)),
        viewer?.id,
      ),
    );

  return useQuery<boolean>({
    queryKey: deckKeys.bulk(deckIds, viewer?.id),
    queryFn: async () => {
      if (!deckIds || deckIds.length === 0) {
        return false;
      }

      // Filter out deck IDs that already have both deck data and deck cards in cache
      const idsToFetch = deckIds.filter(deckId => {
        const deckData = queryClient.getQueryData<DeckData>(deckKeys.detail(deckId, viewer?.id));
        const deckCards = queryClient.getQueryData(deckKeys.cards(deckId, viewer?.id));
        // Only include IDs where either deck data or deck cards are missing from cache
        return !deckData || !deckCards || isSharedPrivateDeck(deckData, viewer?.id);
      });

      // If all decks are already in cache, return early
      if (idsToFetch.length === 0) {
        return true;
      }

      const response = await api.deck.bulk.data.$get({
        query: {
          ids: idsToFetch.join(','),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bulk decks data');
      }

      const data = (await response.json()) as DecksBulkResponse;
      for (const id of idsToFetch) {
        if (!data.decks[id]) {
          await resetDeniedDeckAccess(queryClient, id, viewer?.id);
        }
      }

      // Update the query cache for each deck
      Object.entries(data.decks).forEach(([deckId, deckData]) => {
        // Update deck data in cache
        queryClient.setQueryData(deckKeys.detail(deckId, viewer?.id), deckData);
        queryClient.setQueryDefaults(deckKeys.detail(deckId, viewer?.id), {
          staleTime: isSharedPrivateDeck(deckData, viewer?.id) ? 0 : Infinity,
        });
      });

      // Update the query cache for each deck's cards
      Object.entries(data.cards).forEach(([deckId, cards]) => {
        // Update deck cards in cache
        queryClient.setQueryData(deckKeys.cards(deckId, viewer?.id), { data: cards });
        queryClient.setQueryDefaults(deckKeys.cards(deckId, viewer?.id), {
          staleTime: isSharedPrivateDeck(data.decks[deckId], viewer?.id) ? 0 : Infinity,
        });
      });

      return true;
    },
    enabled: !session.isPending && deckIds !== undefined && deckIds.length > 0,
    staleTime: () => (needsAccessCheck() ? 0 : 5 * 60 * 1000),
    refetchInterval: () => (needsAccessCheck() ? 30_000 : false),
  });
};
