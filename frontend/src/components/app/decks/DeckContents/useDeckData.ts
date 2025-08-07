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
import { groupCardsByCost } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByCost.ts';
import { groupCardsByAspect } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByAspect.ts';
import { groupCardsByTrait } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByTrait.ts';
import { groupCardsByKeywords } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByKeywords.ts';
import { DeckGroupBy } from '../../../../../../types/enums.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

/**
 * Hook to get all deck data including leader, base, cards, and user info
 */
export function useDeckData(deckId: string) {
  const { data: deckInfo } = useGetDeck(deckId);
  const { data: cardList } = useCardList();
  const { data: deckCardsData } = useGetDeckCards(deckId);
  const { data: cardListData } = useCardList();

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

  // Get the current groupBy value from the store
  const { data: groupBy } = useGetUserSetting('deckGroupBy');

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

    // Group cards based on the selected grouping option
    let mainboardGroups;
    if (cardList) {
      switch (groupBy) {
        case DeckGroupBy.COST:
          mainboardGroups = groupCardsByCost(cardList.cards, cardsByBoard[1]);
          break;
        case DeckGroupBy.ASPECT:
          mainboardGroups = groupCardsByAspect(cardList.cards, cardsByBoard[1]);
          break;
        case DeckGroupBy.TRAIT:
          mainboardGroups = groupCardsByTrait(cardList.cards, cardsByBoard[1]);
          break;
        case DeckGroupBy.KEYWORDS:
          mainboardGroups = groupCardsByKeywords(cardList.cards, cardsByBoard[1]);
          break;
        case DeckGroupBy.CARD_TYPE:
        default:
          mainboardGroups = groupCardsByCardType(cardList.cards, cardsByBoard[1]);
          break;
      }
    }

    return {
      mainboardGroups,
      cardsByBoard,
      usedCards,
      usedCardsInBoards,
    };
  }, [cardList, deckCards, groupBy]);

  const [leaderCard, baseCard] = useMemo(() => {
    if (!cardListData || !deckInfo?.deck.leaderCardId1 || !deckInfo?.deck.baseCardId)
      return [undefined, undefined];
    return [
      cardListData.cards[deckInfo.deck.leaderCardId1],
      cardListData.cards[deckInfo.deck.baseCardId],
    ];
  }, [deckInfo?.deck.leaderCardId1]);

  return {
    deckCardsForLayout,
    deckMeta,
    leaderCard,
    baseCard,
    isLoading: !deckInfo || !cardList || !deckCardsData,
  };
}
