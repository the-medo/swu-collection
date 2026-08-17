import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckVersionState } from '../../../../types/Deck.ts';
import type { DeckCard } from '../../../../types/ZDeckCard.ts';

export type DeckVersionDiffResponse = {
  data: {
    versionId: string;
    versionNumber: number;
    state: DeckVersionState;
    cards: Array<Omit<DeckCard, 'deckId'>>;
    changes: Array<{
      cardId: string;
      board: 1 | 2;
      quantityChange: number;
    }>;
    summary: { addedCards: number; removedCards: number; changedCards: number };
  };
};

export const useGetDeckVersionDiff = (deckId: string | undefined, versionId: string | undefined) =>
  useQuery<DeckVersionDiffResponse>({
    queryKey: ['deck-version-diff', deckId, versionId],
    queryFn:
      deckId && versionId
        ? async () => {
            const response = await api.deck[':id'].versions[':versionId'].diff.$get({
              param: { id: deckId, versionId },
            });
            if (!response.ok) throw new Error('Unable to load version changes');
            return (await response.json()) as DeckVersionDiffResponse;
          }
        : skipToken,
  });
