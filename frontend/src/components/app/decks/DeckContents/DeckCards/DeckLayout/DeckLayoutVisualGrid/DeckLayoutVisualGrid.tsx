import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import * as React from 'react';
import DeckCardVisualItem from './DeckCardVisualItem.tsx';

interface DeckLayoutVisualGridProps {
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
}

const DeckLayoutVisualGrid: React.FC<DeckLayoutVisualGridProps> = ({
  deckId,
  deckCardsForLayout: { mainboardGroups, cardsByBoard, usedCardsInBoards, usedCards },
}) => {
  return (
    <div className="flex flex-wrap -mx-3">
      {/* Main Board Groups */}
      {mainboardGroups?.sortedIds.map(groupName => {
        const group = mainboardGroups?.groups[groupName];
        if (!group || group.cards.length === 0) return null;

        return (
          <div key={groupName} className="flex-none w-full px-3">
            <div className="whitespace-nowrap mb-2">
              <span className="inline-block border-b">
                <span className="inline-block text-end mr-2">{/* Type icon could go here */}</span>
                <span className="inline-block mr-1 font-medium">{group.label}</span>
                <span className="inline-block">
                  ({group.cards.reduce((p, c) => p + c.quantity, 0)})
                </span>
              </span>
            </div>
            <ul className="flex flex-col">
              <div className="pr-4 mb-6 pt-[140px] relative">
                {group.cards.map(card => (
                  <DeckCardVisualItem
                    key={card.cardId}
                    deckId={deckId}
                    deckCard={card}
                    card={usedCards[card.cardId]}
                    cardInBoards={usedCardsInBoards[card.cardId]}
                  />
                ))}
              </div>
            </ul>
          </div>
        );
      })}

      {/* Sideboard */}
      {cardsByBoard[2].length > 0 && (
        <div className="flex-none w-full px-3">
          <div className="whitespace-nowrap mb-2">
            <span className="inline-block border-b">
              <span className="inline-block text-end mr-2">
                {/* Sideboard icon could go here */}
              </span>
              <span className="inline-block mr-1 font-medium">Sideboard</span>
              <span className="inline-block">
                ({cardsByBoard[2].reduce((p, c) => p + c.quantity, 0)})
              </span>
            </span>
          </div>
          <ul className="flex flex-col">
            <div className="pr-4 mb-6 pt-[140px] relative">
              {cardsByBoard[2].map(card => (
                <DeckCardVisualItem
                  key={card.cardId}
                  deckId={deckId}
                  deckCard={card}
                  card={usedCards[card.cardId]}
                  cardInBoards={usedCardsInBoards[card.cardId]}
                />
              ))}
            </div>
          </ul>
        </div>
      )}

      {/* Maybeboard */}
      {cardsByBoard[3].length > 0 && (
        <div className="flex-none w-full px-3">
          <div className="whitespace-nowrap mb-2">
            <span className="inline-block border-b">
              <span className="inline-block text-end mr-2">
                {/* Maybeboard icon could go here */}
              </span>
              <span className="inline-block mr-1 font-medium">Maybeboard</span>
              <span className="inline-block">
                ({cardsByBoard[3].reduce((p, c) => p + c.quantity, 0)})
              </span>
            </span>
          </div>
          <ul className="flex flex-col">
            <div className="pr-4 mb-6 pt-[140px] relative">
              {cardsByBoard[3].map(card => (
                <DeckCardVisualItem
                  key={card.cardId}
                  deckId={deckId}
                  deckCard={card}
                  card={usedCards[card.cardId]}
                  cardInBoards={usedCardsInBoards[card.cardId]}
                />
              ))}
            </div>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DeckLayoutVisualGrid;
