import * as React from 'react';
import { useCallback } from 'react';
import { usePutDeckCard } from '@/api/decks/usePutDeckCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { DeckCardInBoards } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckCardDropdownMenu from '@/components/app/decks/DeckContents/DeckCards/DeckCardDropdownMenu.tsx';
import { DeckCard } from '../../../../../../types/ZDeckCard.ts';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import DeckCardQuantitySelector from '@/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx';

interface DeckbuilderCardMenuProps {
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardInBoards: DeckCardInBoards;
  displayQuantity?: boolean;
  displayDropdown?: boolean;
  editable: boolean;
}

const DeckbuilderCardMenu: React.FC<DeckbuilderCardMenuProps> = ({
  deckId,
  deckCard,
  card,
  cardInBoards,
  displayQuantity = true,
  displayDropdown = true,
  editable,
}) => {
  const mutation = usePutDeckCard(deckId);
  const shouldUseCompactQuantitySelector =
    editable && deckCard.quantity <= 3 && deckCard.cardId !== 'swarming-vulture-droid';

  const quantityChangeHandler = useCallback(
    (quantity: number | undefined, board?: number) => {
      mutation.mutate(
        {
          id: {
            cardId: deckCard.cardId,
            board: board ?? deckCard.board,
          },
          data: {
            quantity: quantity ?? 0,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: `Card updated`,
            });
          },
        },
      );
    },
    [deckCard, mutation],
  );

  return (
    <>
      {(displayDropdown || displayQuantity) && (
        <div
          className="flex w-full items-center gap-1"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {displayQuantity &&
            (shouldUseCompactQuantitySelector ? (
              <div className="flex-1">
                <DeckCardQuantitySelector
                  value={deckCard.quantity}
                  onChange={n => quantityChangeHandler(n, 1)}
                  variant="compact"
                  disabled={!editable}
                />
              </div>
            ) : (
              <span className="flex-1 text-center font-semibold">x{deckCard.quantity}</span>
            ))}
          {displayDropdown && (
            <DeckCardDropdownMenu
              deckId={deckId}
              deckCard={deckCard}
              card={card}
              editable={editable}
              cardInBoards={cardInBoards}
              onQuantityChange={quantityChangeHandler}
            />
          )}
        </div>
      )}
    </>
  );
};

export default DeckbuilderCardMenu;
