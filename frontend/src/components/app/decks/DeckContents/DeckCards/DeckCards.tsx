import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useMemo } from 'react';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { useCardList } from '@/api/lists/useCardList.ts';

interface DeckCardsProps {
  deckId: string;
}

const DeckCards: React.FC<DeckCardsProps> = ({ deckId }) => {
  let { data: cardList } = useCardList();
  const { data: deckCardsData } = useGetDeckCards(deckId);

  const deckCards = deckCardsData?.data ?? [];

  const groupedCards = useMemo(() => {
    return cardList ? groupCardsByCardType(cardList?.cards, deckCards) : undefined;
  }, [cardList, deckCards]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-grow gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-col max-h-[400px] flex-wrap gap-4">
            {groupedCards?.sortedIds.map(groupName => {
              const group = groupedCards?.groups[groupName];

              if (!group) return null;
              if (group.cards.length === 0) return null;
              return (
                <div className="flex flex-col gap-1 w-[300px]">
                  <span className="font-medium">{group.label}</span>
                  {group.cards.map(c => {
                    return (
                      <div className="flex gap-2 border-t-[1px] py-1">
                        <span className="font-medium text-sm">{c.quantity}</span>
                        <span className="font text-sm">{c.cardId}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1 w-[300px]">
          <h6>Sideboard</h6>
        </div>
      </div>
      <div className="flex flex-col gap-1 w-[300px]">
        <h6>Maybeboard</h6>
      </div>
      ---
      {JSON.stringify(groupedCards)}
    </div>
  );
};

export default DeckCards;
