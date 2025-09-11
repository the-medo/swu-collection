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

interface DeckbuilderCardMenuProps {
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardInBoards: DeckCardInBoards;
  displayQuantity?: boolean;
  displayDropdown?: boolean;
}

const DeckbuilderCardMenu: React.FC<DeckbuilderCardMenuProps> = ({
  deckId,
  deckCard,
  card,
  cardInBoards,
  displayQuantity = true,
  displayDropdown = true,
}) => {
  const mutation = usePutDeckCard(deckId);

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
    [deckCard],
  );

  return (
    <>
      {(displayDropdown || displayQuantity) && (
        <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
          {displayQuantity && <span className="font-semibold">x{deckCard.quantity}</span>}
          {displayDropdown && (
            <DeckCardDropdownMenu
              deckId={deckId}
              deckCard={deckCard}
              card={card}
              owned={true}
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
