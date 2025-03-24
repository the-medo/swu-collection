import { DeckCard } from '../../../../../../../../../types/ZDeckCard.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';
import * as React from 'react';
import { useCallback } from 'react';
import { useDeckInfo } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { usePutDeckCard } from '@/api/decks/usePutDeckCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { DeckCardInBoards } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckCardDropdownMenu from '@/components/app/decks/DeckContents/DeckCards/DeckCardDropdownMenu.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';

interface DeckCardVisualItemProps {
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardInBoards: DeckCardInBoards;
}

const DeckCardVisualItem: React.FC<DeckCardVisualItemProps> = ({
  deckId,
  deckCard,
  card,
  cardInBoards,
}) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { owned } = useDeckInfo(deckId);
  const mutation = usePutDeckCard(deckId);
  const defaultVariant = card ? selectDefaultVariant(card) : undefined;

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
    <div
      className={cn(
        'relative inline-block align-middle mr-[1px] -mt-[140px] rounded-[4.75%/3.5%] isolate group',
        { 'cursor-pointer': true },
      )}
      data-card-id={deckCard.cardId}
    >
      <div className="absolute top-8 right-3 px-2 z-10 bg-black/80 rounded flex gap-2 items-center">
        <span className="font-semibold">x{deckCard.quantity}</span>
        <DeckCardDropdownMenu
          deckId={deckId}
          deckCard={deckCard}
          card={card}
          owned={owned}
          cardInBoards={cardInBoards}
          onQuantityChange={quantityChangeHandler}
        />
      </div>

      {/* Card Image */}
      <div
        className="cursor-pointer"
        onClick={() => {
          void navigate({
            search: prev => ({ ...prev, modalCardId: deckCard.cardId }),
          });
        }}
      >
        <CardImage card={card} cardVariantId={defaultVariant} size="w200" backSideButton={false} />
      </div>
    </div>
  );
};

export default DeckCardVisualItem;
