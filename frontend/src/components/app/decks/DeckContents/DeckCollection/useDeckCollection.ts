import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorWithStatus } from '../../../../../../../types/ErrorWithStatus.ts';
import { useEffect } from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

export type DeckCollectionData = {
  total: number;
  missingTotal: number;
  missingCards: Record<string, Record<number, number | undefined> | undefined>;
} | null;

export function useDeckCollection(deckId: string) {
  const { data: collectionInfoInDecks } = useGetUserSetting('collectionInfoInDecks');
  const queryClient = useQueryClient();
  const { deckCardsForLayout } = useDeckData(deckId);
  const { data } = useUserCollectionsData(!collectionInfoInDecks);

  useEffect(() => {
    if (!collectionInfoInDecks) {
      queryClient.setQueryData<DeckCollectionData>(['deck-collection-data', deckId], () => null);
      return;
    }
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

    queryClient.setQueryData<DeckCollectionData>(['deck-collection-data', deckId], () => ({
      total,
      missingTotal,
      missingCards,
    }));
  }, [deckCardsForLayout, data, collectionInfoInDecks]);

  return useQuery<DeckCollectionData, ErrorWithStatus>({
    queryKey: ['deck-collection-data', deckId],
    queryFn: () => {
      return null;
    },
    staleTime: Infinity,
  });
}
