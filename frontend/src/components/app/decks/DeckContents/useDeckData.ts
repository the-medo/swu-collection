import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useMemo } from 'react';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  DeckCardsForLayout,
  DeckCardsInBoards,
  DeckCardsUsed,
} from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { DeckCard } from '../../../../../../types/ZDeckCard.ts';

/**
 * Hook to get all deck data including leader, base, cards, and user info
 */
export function useDeckData(deckId: string) {
  const { data: deckInfo } = useGetDeck(deckId);
  const { data: cardList } = useCardList();
  const { data: deckCardsData } = useGetDeckCards(deckId);

  const deckCards = deckCardsData?.data ?? [];

  // Get additional deck meta information
  const deckMeta = useMemo(() => {
    return {
      leader1: deckInfo?.deck.leaderCardId1 ? cardList?.cards[deckInfo.deck.leaderCardId1] : null,
      leader2: deckInfo?.deck.leaderCardId2 ? cardList?.cards[deckInfo.deck.leaderCardId2] : null,
      base: deckInfo?.deck.baseCardId ? cardList?.cards[deckInfo.deck.baseCardId] : null,
      name: deckInfo?.deck.name || '',
      author: deckInfo?.user.displayName || '',
      format: deckInfo?.deck.format || 1,
    };
  }, [deckInfo, cardList]);

  // Process deck data for display
  const deckCardsForLayout = useMemo((): DeckCardsForLayout => {
    const cardsByBoard: Record<number, DeckCard[]> = {
      1: [],
      2: [],
      3: [],
    };

    const usedCards: DeckCardsUsed = {};
    const usedCardsInBoards: DeckCardsInBoards = {};

    if (deckMeta.leader1) usedCards[deckMeta.leader1.cardId] = deckMeta.leader1;
    if (deckMeta.leader2) usedCards[deckMeta.leader2.cardId] = deckMeta.leader2;
    if (deckMeta.base) usedCards[deckMeta.base.cardId] = deckMeta.base;

    deckCards.forEach(c => {
      if (!c) return;
      cardsByBoard[c.board].push(c);
      if (!usedCardsInBoards[c.cardId]) usedCardsInBoards[c.cardId] = {};
      usedCardsInBoards[c.cardId]![c.board] = c.quantity;

      const card = cardList?.cards[c.cardId];
      usedCards[c.cardId] = card;
    });

    // Sort cards by cost within each board
    for (let i = 1; i <= 3; i++) {
      cardsByBoard[i].sort(
        (a, b) => (cardList?.cards[a.cardId]?.cost ?? 0) - (cardList?.cards[b.cardId]?.cost ?? 0),
      );
    }

    const mainboardGroups = cardList
      ? groupCardsByCardType(cardList?.cards, cardsByBoard[1])
      : undefined;

    return {
      mainboardGroups,
      cardsByBoard,
      usedCards,
      usedCardsInBoards,
    };
  }, [cardList, deckCards]);

  return {
    deckCardsForLayout,
    deckMeta,
    isLoading: !deckInfo || !cardList || !deckCardsData,
  };
}
