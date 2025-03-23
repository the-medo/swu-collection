import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { usePutDeckCard } from '@/api/decks/usePutDeckCard.ts';
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast.ts';
import DebouncedInput from '@/components/app/global/DebouncedInput/DebouncedInput.tsx';
import { useDeckInfo } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import DeckCardDropdownMenu from '@/components/app/decks/DeckContents/DeckCards/DeckCardDropdownMenu.tsx';

import { CardInBoards } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';

export interface DeckCardRowProps {
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardInBoards: CardInBoards;
}

const DeckCardRow: React.FC<DeckCardRowProps> = ({ deckId, deckCard, card, cardInBoards }) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { owned } = useDeckInfo(deckId);
  const defaultVariant = card ? selectDefaultVariant(card) : '';
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
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <div className="flex gap-2 border-t-[1px] py-1 w-[350px] items-center">
          <div>
            {owned ? (
              <DebouncedInput
                type="number"
                onChange={quantityChangeHandler}
                value={deckCard.quantity}
                width="sm"
                size="xs"
                alignment="right"
                appearance="ghost"
                min={0}
                max={15}
              />
            ) : (
              <span className="text-md px-2">{deckCard.quantity}</span>
            )}
          </div>
          <div
            className="flex gap-1 font text-sm w-full items-center justify-between cursor-pointer"
            onClick={() => {
              void navigate({
                search: prev => ({ ...prev, modalCardId: deckCard.cardId }),
              });
            }}
          >
            <span>{card?.name}</span>
            <div className="flex gap-2 justify-end">
              <div className="flex gap-0 w-[50px] justify-end">
                {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="xSmall" /> : null}
                {card?.aspects.map((a, i) => (
                  <AspectIcon key={`${a}${i}`} aspect={a} size="xSmall" />
                ))}
              </div>
            </div>
          </div>
          <DeckCardDropdownMenu
            deckId={deckId}
            deckCard={deckCard}
            card={card}
            owned={owned}
            cardInBoards={cardInBoards}
            onQuantityChange={quantityChangeHandler}
          />
        </div>
      </HoverCardTrigger>

      <HoverCardContent
        className={cn(
          cardImageVariants({
            size: 'original',
            horizontal: card?.front.horizontal ?? false,
          }),
          'm-0 p-0 w-fit',
        )}
        side="right"
      >
        <CardImage card={card} cardVariantId={defaultVariant} size="original" />
      </HoverCardContent>
    </HoverCard>
  );
};

export default DeckCardRow;
