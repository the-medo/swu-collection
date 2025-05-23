import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckData } from '../../../../types/Deck.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';

export interface DecksBulkResponse {
  decks: Record<string, DeckData>;
  cards: Record<string, DeckCard[]>;
}

export const useGetBulkDecks = (deckIds: string[] | undefined) => {
  const queryClient = useQueryClient();

  return useQuery<DecksBulkResponse>({
    queryKey: ['decks-bulk', deckIds ? deckIds.join(',') : null],
    queryFn: async () => {
      if (!deckIds || deckIds.length === 0) {
        return { decks: {}, cards: {} };
      }

      const response = await api.deck.bulk.$get({
        query: {
          ids: deckIds.join(','),
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

      return data;
    },
    enabled: deckIds !== undefined && deckIds.length > 0,
    staleTime: Infinity,
  });
};