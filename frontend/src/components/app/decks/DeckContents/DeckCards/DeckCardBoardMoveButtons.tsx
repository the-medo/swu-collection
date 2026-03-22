import { DeckCardQuantityChangeHandler } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { DeckCardTextRowProps } from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckCardTextRow.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ChevronDown, ChevronsDown, ChevronsUp, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { useCallback } from 'react';
import DeckCardQuantitySelector from '@/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx';

interface DeckCardBoardMoveButtonsProps extends DeckCardTextRowProps {
  onChange: DeckCardQuantityChangeHandler;
}

const DeckCardBoardMoveButtons: React.FC<DeckCardBoardMoveButtonsProps> = ({
  deckCard,
  cardInBoards,
  onChange,
}) => {
  const onMoveToDifferentBoard = useCallback(
    (type: 'all' | 'one', newBoard: number) => {
      if (deckCard.board === newBoard) return;
      if (deckCard.quantity <= 0) return;
      const currentBoardNewQuantity = type === 'all' ? 0 : deckCard.quantity - 1;

      const cardCountInNewBoard = cardInBoards?.[newBoard] ?? 0;
      const nextBoardNewQuantity = Math.min(
        deckCard.cardId === 'swarming-vulture-droid' ? Infinity : 3,
        (type === 'all' ? deckCard.quantity : 1) + cardCountInNewBoard,
      );

      onChange(currentBoardNewQuantity, deckCard.board);
      onChange(nextBoardNewQuantity, newBoard);
    },
    [deckCard.board, deckCard.cardId, deckCard.quantity, cardInBoards],
  );

  return (
    <>
      <div className="w-24 -ml-12 z-10">
        <DeckCardQuantitySelector value={deckCard.quantity} onChange={onChange} variant="compact" />
      </div>
      {deckCard.board !== 1 && (
        <div className="flex gap-1 items-center">
          <div className="flex flex-col gap-0 font-semibold text-[10px]">
            <span className="-mt-1">Main</span>
            <span className="-mt-1">deck</span>
          </div>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('all', 1);
            }}
          >
            <ChevronsUp />
          </Button>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('one', 1);
            }}
          >
            <ChevronUp />
          </Button>
        </div>
      )}
      {deckCard.board !== 2 && (
        <div className="flex gap-1 items-center">
          <div className="flex flex-col gap-0 font-semibold text-[10px]">
            <span className="-mt-1">Side</span>
            <span className="-mt-1">board</span>
          </div>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('all', 2);
            }}
            title="Move all copies to sideboard"
          >
            {deckCard.board === 1 ? <ChevronsDown /> : <ChevronsUp />}
          </Button>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('one', 2);
            }}
            title="Move single copy to sideboard"
          >
            {deckCard.board === 1 ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
      )}
      {deckCard.board !== 3 && (
        <div className="flex gap-1 items-center">
          <div className="flex flex-col gap-0 font-semibold text-[10px]">
            <span className="-mt-1">Maybe</span>
            <span className="-mt-1">board</span>
          </div>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('all', 3);
            }}
            title="Move all copies to maybeboard"
          >
            <ChevronsDown />
          </Button>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('one', 3);
            }}
            title="Move single copy to maybeboard"
          >
            <ChevronDown />
          </Button>
        </div>
      )}
    </>
  );
};

export default DeckCardBoardMoveButtons;
