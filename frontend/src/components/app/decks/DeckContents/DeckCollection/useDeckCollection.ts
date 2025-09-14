import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorWithStatus } from '../../../../../../../types/ErrorWithStatus.ts';
import { useEffect, useMemo } from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';
import { DeckCardResponse } from '@/api/decks/useGetDeckCards.ts';

export type DeckCollectionData = {
  total: number;
  missingTotal: number;
  missingCards: Record<string, Record<number, number | undefined> | undefined>;
};

export function useDeckCollection(deckId: string) {
  const queryClient = useQueryClient();
  const { deckCardsForLayout } = useDeckData(deckId);
  const { data } = useUserCollectionsData();

  useEffect(() => {
    let total = 0;
    let missingTotal = 0;
    const missingCards: Record<string, Record<number, number | undefined> | undefined> = {};
    Object.entries(deckCardsForLayout.usedCardsInBoards).forEach(([cardId, cardInBoards]) => {
      let cardForDecks = data?.cards?.[cardId]?.[1]?.forDecks ?? 0;

      const inMain = cardInBoards?.[1] ?? 0;
      const inSide = cardInBoards?.[2] ?? 0;

      total += inMain + inSide;

      if (inMain > 0) {
        cardForDecks -= inMain;
        if (cardForDecks < 0) {
          missingTotal += Math.abs(cardForDecks);
          missingCards[cardId] = { 1: Math.abs(cardForDecks) };
          cardForDecks = 0;
        }
      }

      if (inSide > 0) {
        cardForDecks -= inSide;
        if (cardForDecks < 0) {
          missingTotal += Math.abs(cardForDecks);
          if (!(cardId in missingCards)) missingCards[cardId] = {};
          missingCards[cardId]![2] = Math.abs(cardForDecks);
        }
      }
    });

    queryClient.setQueryData<DeckCardResponse>(['deck-collection-data', deckId], oldData => ({
      total,
      missingTotal,
      missingCards,
    }));
  }, [deckCardsForLayout, data]);

  return useQuery<DeckCollectionData, ErrorWithStatus>({
    queryKey: ['deck-collection-data', deckId],
    queryFn: () => {
      return {
        total: 0,
        missingTotal: 0,
        missingCards: {},
      };
    },
    staleTime: Infinity,
  });
}
