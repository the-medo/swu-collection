import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useMemo } from 'react';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import DeckCardRow from '@/components/app/decks/DeckContents/DeckCards/DeckCardRow.tsx';

interface DeckCardsProps {
  deckId: string;
}

const DeckCards: React.FC<DeckCardsProps> = ({ deckId }) => {
  let { data: cardList } = useCardList();
  const { data: deckCardsData } = useGetDeckCards(deckId);

  const deckCards = deckCardsData?.data ?? [];

  const { mainboardGroups, cardsByBoard, usedCards } = useMemo(() => {
    const cardsByBoard: Record<number, DeckCard[]> = {
      1: [],
      2: [],
      3: [],
    };

    const usedCards: Record<string, CardDataWithVariants<CardListVariants> | undefined> = {};

    deckCards.forEach(c => {
      cardsByBoard[c.board].push(c);

      const card = cardList?.cards[c.cardId];
      usedCards[c.cardId] = card;
    });

    const mainboardGroups = cardList
      ? groupCardsByCardType(cardList?.cards, cardsByBoard[1])
      : undefined;

    return {
      mainboardGroups,
      cardsByBoard,
      usedCards,
    };
  }, [cardList, deckCards]);

  const columnClasses = 'columns-1 lg:columns-2 min-[1660px]:columns-3 gap-4 space-y-4';

  return (
    <div className="flex w-full flex-col gap-4">
      <article className={columnClasses}>
        {mainboardGroups?.sortedIds.map(groupName => {
          const group = mainboardGroups?.groups[groupName];

          if (!group) return null;
          if (group.cards.length === 0) return null;
          return (
            <div className="flex flex-col gap-1 w-[350px] p-1 break-inside-avoid">
              <span className="font-medium">{group.label}</span>
              {group.cards.map(c => {
                return (
                  <DeckCardRow
                    key={c.cardId}
                    deckId={deckId}
                    deckCard={c}
                    card={usedCards[c.cardId]}
                  />
                );
              })}
            </div>
          );
        })}
        <div className="flex flex-col gap-1 w-[350px] p-1 bg-yellow-100">
          <span className="font-medium">Sideboard</span>
          {cardsByBoard[2].length === 0 && <span className="text-sm">No cards in sideboard</span>}
          {cardsByBoard[2].map(c => {
            return (
              <DeckCardRow key={c.cardId} deckId={deckId} deckCard={c} card={usedCards[c.cardId]} />
            );
          })}
        </div>
      </article>
      <div className="flex flex-col mt-8 gap-1 w-full">
        <span className="font-medium">Maybeboard</span>
        <div className={columnClasses}>
          {cardsByBoard[3].length === 0 && <span className="text-sm">No cards in maybeboard</span>}
          {cardsByBoard[3].map(c => {
            return (
              <DeckCardRow key={c.cardId} deckId={deckId} deckCard={c} card={usedCards[c.cardId]} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeckCards;
