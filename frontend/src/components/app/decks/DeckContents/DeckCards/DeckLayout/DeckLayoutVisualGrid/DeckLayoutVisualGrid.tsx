import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import * as React from 'react';
import DeckCardVisualItem from './DeckCardVisualItem.tsx';
import { DeckLayout } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { cn } from '@/lib/utils.ts';

export type DeckLayoutVisualGridVariant = 'overlap' | 'no-overlap';

interface DeckLayoutVisualGridProps {
  variant: DeckLayoutVisualGridVariant;
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
  highlightedCardId?: string;
}

const DeckLayoutVisualGrid: React.FC<DeckLayoutVisualGridProps> = ({
  variant,
  deckId,
  deckCardsForLayout: { mainboardGroups, cardsByBoard, usedCardsInBoards, usedCards },
  highlightedCardId,
}) => {
  const deckLayout =
    variant === 'overlap' ? DeckLayout.VISUAL_GRID_OVERLAP : DeckLayout.VISUAL_GRID;

  return (
    <div className="flex flex-wrap">
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
              <div
                className={cn('pr-4 mb-6 relative', {
                  'pt-[140px]': variant === 'overlap',
                })}
              >
                {group.cards.map(card => (
                  <DeckCardVisualItem
                    key={card.cardId}
                    deckLayout={deckLayout}
                    deckId={deckId}
                    deckCard={card}
                    card={usedCards[card.cardId]}
                    cardInBoards={usedCardsInBoards[card.cardId]}
                    isHighlighted={highlightedCardId === card.cardId}
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
            <div
              className={cn('pr-4 mb-6 relative', {
                'pt-[140px]': variant === 'overlap',
              })}
            >
              {cardsByBoard[2].map(card => (
                <DeckCardVisualItem
                  key={card.cardId}
                  deckLayout={deckLayout}
                  deckId={deckId}
                  deckCard={card}
                  card={usedCards[card.cardId]}
                  cardInBoards={usedCardsInBoards[card.cardId]}
                  isHighlighted={highlightedCardId === card.cardId}
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
            <div
              className={cn('pr-4 mb-6 relative', {
                'pt-[140px]': variant === 'overlap',
              })}
            >
              {cardsByBoard[3].map(card => (
                <DeckCardVisualItem
                  key={card.cardId}
                  deckLayout={deckLayout}
                  deckId={deckId}
                  deckCard={card}
                  card={usedCards[card.cardId]}
                  cardInBoards={usedCardsInBoards[card.cardId]}
                  isHighlighted={highlightedCardId === card.cardId}
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
