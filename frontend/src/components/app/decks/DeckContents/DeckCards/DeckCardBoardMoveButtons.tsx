import { DeckCardQuantityChangeHandler } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { DeckCardRowProps } from '@/components/app/decks/DeckContents/DeckCards/DeckCardRow.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ChevronDown, ChevronsDown, ChevronsUp, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { useCallback } from 'react';

interface DeckCardBoardMoveButtonsProps extends DeckCardRowProps {
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
      <span className="font-semibold">Move to:</span>
      {deckCard.board !== 1 && (
        <div className="flex gap-1 items-center">
          <span className="font-semibold">MD</span>
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
          <span className="font-semibold">SB</span>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('all', 2);
            }}
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
          >
            {deckCard.board === 1 ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
      )}
      {deckCard.board !== 3 && (
        <div className="flex gap-1 items-center">
          <span className="font-semibold">MB</span>
          <Button
            size="iconSmall"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onMoveToDifferentBoard('all', 3);
            }}
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
          >
            <ChevronDown />
          </Button>
        </div>
      )}
    </>
  );
};

export default DeckCardBoardMoveButtons;
