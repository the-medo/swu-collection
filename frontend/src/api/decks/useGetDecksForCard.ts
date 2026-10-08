import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { deckKeys } from './queryKeys.ts';

export function useGetDecksForCard(cardId: string) {
  return useQuery({
    queryKey: deckKeys.forCard(cardId),
    queryFn: cardId
      ? async ({ signal }) => {
          const response = await api.deck.card[':cardId'].$get(
            { param: { cardId } },
            { init: { signal } },
          );
          if (!response.ok) {
            throw await createApiError(response, 'Unable to load decks with this card.');
          }
          return response.json();
        }
      : skipToken,
    // Refresh whenever the tab is opened, including after editing a deck.
    staleTime: 0,
    retry: false,
    // The shared decks table accepts database-style dates for its price badges.
    select: response =>
      response.data.map(item => ({
        ...item,
        entityPrices: item.entityPrices.map(price => ({
          ...price,
          updatedAt: price.updatedAt ? new Date(price.updatedAt) : null,
        })),
      })),
  });
}
