import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import React, { useMemo } from 'react';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import {
  DeckCardsInBoards,
  DeckCardsUsed,
} from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckLayout from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayout.tsx';

interface DeckCardsProps {
  deckId: string;
}

const DeckCards: React.FC<DeckCardsProps> = ({ deckId }) => {
  let { data: cardList } = useCardList();
  const { data: deckCardsData } = useGetDeckCards(deckId);

  const deckCards = deckCardsData?.data ?? [];

  const deckCardsForLayout = useMemo(() => {
    const cardsByBoard: Record<number, DeckCard[]> = {
      1: [],
      2: [],
      3: [],
    };

    const usedCards: DeckCardsUsed = {};
    const usedCardsInBoards: DeckCardsInBoards = {};

    deckCards.forEach(c => {
      if (!c) return;
      cardsByBoard[c.board].push(c);
      if (!usedCardsInBoards[c.cardId]) usedCardsInBoards[c.cardId] = {};
      usedCardsInBoards[c.cardId]![c.board] = c.quantity;

      const card = cardList?.cards[c.cardId];
      usedCards[c.cardId] = card;
    });

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

  return <DeckLayout deckId={deckId} deckCardsForLayout={deckCardsForLayout} />;
};

export default DeckCards;
