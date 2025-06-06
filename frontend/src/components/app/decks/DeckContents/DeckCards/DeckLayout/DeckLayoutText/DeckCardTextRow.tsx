import { DeckCard } from '../../../../../../../../../types/ZDeckCard.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';
import { cn } from '@/lib/utils.ts';
import * as React from 'react';
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
import { DeckCardInBoards } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckCardBoardMoveButtons from '@/components/app/decks/DeckContents/DeckCards/DeckCardBoardMoveButtons.tsx';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

export type DeckCardRowVariant = 'normal' | 'compact';

export interface DeckCardTextRowProps {
  variant?: DeckCardRowVariant;
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardInBoards: DeckCardInBoards;
  isHighlighted?: boolean;
}

const DeckCardTextRow: React.FC<DeckCardTextRowProps> = ({
  variant = 'normal',
  deckId,
  deckCard,
  card,
  cardInBoards,
  isHighlighted,
}) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { isMobile } = useSidebar();
  const { owned } = useDeckInfo(deckId);
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
    <DeckCardHoverImage card={card}>
      <div
        className={cn('flex gap-2 w-[350px] items-center', {
          'py-1 border-t-[1px]': variant === 'normal',
          'py-0': variant === 'compact',
          'bg-primary/10 border border-primary rounded-sm': isHighlighted,
        })}
      >
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
          className={cn(
            'flex gap-1 font text-sm w-full items-center justify-between cursor-pointer',
            {
              group: owned && !isMobile,
            },
          )}
          onClick={() => {
            void navigate({
              search: prev => ({ ...prev, modalCardId: deckCard.cardId }),
            });
          }}
        >
          <span
            className={cn('max-w-[220px] truncate ellipsis overflow-hidden whitespace-nowrap', {
              'group-hover:hidden': owned,
              'text-xs': variant === 'compact',
            })}
          >
            {card?.name}
          </span>
          <div className="flex gap-2 justify-end">
            <div
              className={cn('flex gap-0 w-[50px] justify-end', {
                'group-hover:hidden': owned,
              })}
            >
              {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="xSmall" /> : null}
              {card?.aspects.map((a, i) => (
                <AspectIcon key={`${a}${i}`} aspect={a} size="xSmall" />
              ))}
            </div>
            {owned && (
              <div className="hidden group-hover:flex gap-8 items-center w-full">
                <DeckCardBoardMoveButtons
                  deckId={deckId}
                  deckCard={deckCard}
                  card={card}
                  cardInBoards={cardInBoards}
                  onChange={quantityChangeHandler}
                />
              </div>
            )}
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
    </DeckCardHoverImage>
  );
};

export default DeckCardTextRow;
