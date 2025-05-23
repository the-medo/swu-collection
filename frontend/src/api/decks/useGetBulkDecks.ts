import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useGetBulkDecks = (deckIds: string[] | undefined) => {
  const queryClient = useQueryClient();

  return useQuery<boolean>({
    queryKey: ['decks-bulk', deckIds ? deckIds.join(',') : null],
    queryFn: async () => {
      if (!deckIds || deckIds.length === 0) {
        return false;
      }

      // Filter out deck IDs that already have both deck data and deck cards in cache
      const idsToFetch = deckIds.filter(deckId => {
        const deckData = queryClient.getQueryData(['deck', deckId]);
        const deckCards = queryClient.getQueryData(['deck-content', deckId]);
        // Only include IDs where either deck data or deck cards are missing from cache
        return !deckData || !deckCards;
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

      const data = await response.json();

      // Update the query cache for each deck
      Object.entries(data.decks).forEach(([deckId, deckData]) => {
        // Update deck data in cache
        queryClient.setQueryData(['deck', deckId], deckData);
      });

      // Update the query cache for each deck's cards
      Object.entries(data.cards).forEach(([deckId, cards]) => {
        // Update deck cards in cache
        queryClient.setQueryData(['deck-content', deckId], { data: cards });
      });

      return true;
    },
    enabled: deckIds !== undefined && deckIds.length > 0,
    staleTime: 60 * 1000, // 1min
  });
};
