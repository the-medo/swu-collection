import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import * as React from 'react';
import DeckCardVisualItem from './DeckCardVisualItem.tsx';
import { DeckLayout } from '../../../../../../../../../types/enums.ts';

export type DeckLayoutVisualStacksVariant = 'normal' | 'split';

interface DeckLayoutVisualStacksProps {
  variant: DeckLayoutVisualStacksVariant;
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
  highlightedCardId?: string;
}

const DeckLayoutVisualStacks: React.FC<DeckLayoutVisualStacksProps> = ({
  variant,
  deckId,
  deckCardsForLayout: { mainboardGroups, cardsByBoard, usedCardsInBoards, usedCards },
  highlightedCardId,
}) => {
  const deckLayout =
    variant === 'normal' ? DeckLayout.VISUAL_STACKS : DeckLayout.VISUAL_STACKS_SPLIT;

  return (
    <div className="flex flex-wrap">
      {/* Main Board Groups */}
      {mainboardGroups?.sortedIds.map(groupName => {
        const group = mainboardGroups?.groups[groupName];
        if (!group || group.cards.length === 0) return null;

        return (
          <div key={groupName} className="flex-none px-3">
            <div className="whitespace-nowrap mb-2">
              <span className="inline-block border-b">
                <span className="inline-block text-end mr-2">{/* Type icon could go here */}</span>
                <span className="inline-block mr-1 font-medium">{group.label}</span>
                <span className="inline-block">
                  ({group.cards.reduce((p, c) => p + c.quantity, 0)})
                </span>
              </span>
            </div>
            <ul className="flex flex-col pt-[240px]">
              {group.cards.map(card =>
                (variant === 'normal' ? [1] : Array.from({ length: card.quantity })).map((_, i) => {
                  return (
                    <DeckCardVisualItem
                      key={`${card.cardId}-${i}`}
                      deckLayout={deckLayout}
                      deckId={deckId}
                      deckCard={card}
                      card={usedCards[card.cardId]}
                      cardInBoards={usedCardsInBoards[card.cardId]}
                      displayDropdown={i === 0}
                      displayQuantity={i === 0}
                      isHighlighted={highlightedCardId === card.cardId}
                    />
                  );
                }),
              )}
            </ul>
          </div>
        );
      })}

      {/* Sideboard */}
      {cardsByBoard[2].length > 0 && (
        <div className="flex-none px-3">
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
          <ul className="flex flex-col pt-[240px]">
            {cardsByBoard[2].map(card =>
              (variant === 'normal' ? [1] : Array.from({ length: card.quantity })).map((_, i) => {
                return (
                  <DeckCardVisualItem
                    key={`${card.cardId}-${i}`}
                    deckLayout={deckLayout}
                    deckId={deckId}
                    deckCard={card}
                    card={usedCards[card.cardId]}
                    cardInBoards={usedCardsInBoards[card.cardId]}
                    displayDropdown={i === 0}
                    displayQuantity={i === 0}
                    isHighlighted={highlightedCardId === card.cardId}
                  />
                );
              }),
            )}
          </ul>
        </div>
      )}

      {/* Maybeboard */}
      {cardsByBoard[3].length > 0 && (
        <div className="flex-none px-3">
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
          <ul className="flex flex-col pt-[240px]">
            {cardsByBoard[3].map(card =>
              (variant === 'normal' ? [1] : Array.from({ length: card.quantity })).map((_, i) => {
                return (
                  <DeckCardVisualItem
                    key={`${card.cardId}-${i}`}
                    deckLayout={deckLayout}
                    deckId={deckId}
                    deckCard={card}
                    card={usedCards[card.cardId]}
                    cardInBoards={usedCardsInBoards[card.cardId]}
                    displayDropdown={i === 0}
                    displayQuantity={i === 0}
                    isHighlighted={highlightedCardId === card.cardId}
                  />
                );
              }),
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DeckLayoutVisualStacks;
