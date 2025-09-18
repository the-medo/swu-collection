import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorWithStatus } from '../../../../../../../types/ErrorWithStatus.ts';
import { useEffect } from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { CardOwnedQuantity } from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsTable/missingCardsTableLib.ts';

export type DeckCollectionData = {
  total: number;
  missingTotal: number;
  missingCards: Record<
    string,
    (Record<number, number | undefined> & { quantity: number }) | undefined
  >;
  usedCards: DeckCardsForLayout['usedCards'];
  ownedCardQuantity: Record<string, CardOwnedQuantity>;
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
    const missingCards: Record<
      string,
      (Record<number, number | undefined> & { quantity: number }) | undefined
    > = {};
    Object.entries(deckCardsForLayout.usedCardsInBoards).forEach(([cardId, cardInBoards]) => {
      let cardForDecks = data?.cards?.[cardId]?.[1]?.forDecks ?? 0;

      const inMain = cardInBoards?.[1] ?? 0;
      const inSide = cardInBoards?.[2] ?? 0;

      const totalForCard = inMain + inSide;
      total += totalForCard;

      if (inMain > 0) {
        cardForDecks -= inMain;
        if (cardForDecks < 0) {
          missingTotal += Math.abs(cardForDecks);
          missingCards[cardId] = { 1: Math.abs(cardForDecks), quantity: totalForCard };
          cardForDecks = 0;
        }
      }

      if (inSide > 0) {
        cardForDecks -= inSide;
        if (cardForDecks < 0) {
          missingTotal += Math.abs(cardForDecks);
          if (!(cardId in missingCards)) missingCards[cardId] = { quantity: totalForCard };
          missingCards[cardId]![2] = Math.abs(cardForDecks);
        }
      }

      if (!missingCards[cardId]) missingCards[cardId] = { quantity: totalForCard };
    });

    // Compute ownedCardQuantity per card used in this deck
    const ownedCardQuantity: Record<string, CardOwnedQuantity> = {};
    Object.keys(deckCardsForLayout.usedCardsInBoards).forEach(cardId => {
      // console.log(cardId, data?.cards?.[cardId]);
      const colEntry = data?.cards?.[cardId]?.[1]; // CollectionType.COLLECTION = 1
      const wantEntry = data?.cards?.[cardId]?.[2]; // CollectionType.WANTLIST = 2
      const otherEntry = data?.cards?.[cardId]?.[3]; // CollectionType.OTHER = 3

      const deckCollection = colEntry?.forDecks ?? 0;
      const nonDeckCollection = (colEntry?.total ?? 0) - deckCollection;
      const wantlist = wantEntry?.total ?? 0;
      const cardlist = otherEntry?.total ?? 0;

      ownedCardQuantity[cardId] = { deckCollection, nonDeckCollection, wantlist, cardlist };
    });

    queryClient.setQueryData<DeckCollectionData>(['deck-collection-data', deckId], () => ({
      total,
      missingTotal,
      missingCards,
      usedCards: deckCardsForLayout.usedCards,
      ownedCardQuantity,
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
