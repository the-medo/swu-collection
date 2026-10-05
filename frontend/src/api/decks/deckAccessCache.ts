import type { QueryClient } from '@tanstack/react-query';
import type { DeckData } from '../../../../types/Deck.ts';
import { deckKeys } from './queryKeys.ts';

export function isSharedPrivateDeck(data: Pick<DeckData, 'deck'> | undefined, viewerId?: string) {
  return !!data && data.deck.public === 0 && data.deck.userId !== viewerId;
}

export async function resetDeniedDeckAccess(
  client: QueryClient,
  id: string,
  viewerId: string | undefined,
) {
  // Clear private data without detaching active observers; their refetch reports the denial.
  await Promise.all([
    client.resetQueries({ queryKey: deckKeys.detail(id, viewerId), exact: true }),
    client.resetQueries({ queryKey: deckKeys.cards(id, viewerId), exact: true }),
  ]);
}

export function updateDeckPricesCache(
  client: QueryClient,
  id: string,
  viewerId: string | undefined,
  prices: DeckData['entityPrices'],
) {
  client.setQueryData<DeckData>(deckKeys.detail(id, viewerId), current =>
    current ? { ...current, entityPrices: prices } : current,
  );
}
