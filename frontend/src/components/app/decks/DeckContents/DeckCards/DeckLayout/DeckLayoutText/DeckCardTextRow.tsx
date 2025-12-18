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
import { useDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';
import { useNavigate } from '@tanstack/react-router';
import DeckCardDropdownMenu from '@/components/app/decks/DeckContents/DeckCards/DeckCardDropdownMenu.tsx';
import { DeckCardInBoards } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckCardBoardMoveButtons from '@/components/app/decks/DeckContents/DeckCards/DeckCardBoardMoveButtons.tsx';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import DeckCardPriceBadge from './DeckCardPriceBadge.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

export type DeckCardRowVariant = 'normal' | 'compact';

export interface DeckCardTextRowProps {
  variant?: DeckCardRowVariant;
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
  cardInBoards: DeckCardInBoards;
  missingCardInBoards?: DeckCardInBoards;
  displayMissingCards?: boolean;
  isHighlighted?: boolean;
}

const DeckCardTextRow: React.FC<DeckCardTextRowProps> = ({
  variant = 'normal',
  deckId,
  deckCard,
  card,
  cardInBoards,
  missingCardInBoards,
  displayMissingCards = false,
  isHighlighted,
}) => {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { editable } = useDeckInfo(deckId);
  const mutation = usePutDeckCard(deckId);
  const { data: displayDeckPrice } = useGetUserSetting('deckPrices');

  const missingAmount = missingCardInBoards?.[deckCard.board] ?? 0;

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
        className={cn('flex gap-2 items-center', displayDeckPrice ? 'w-[400px]' : 'w-[350px]', {
          'py-1 border-t': variant === 'normal',
          'py-0': variant === 'compact',
          'bg-primary/10 border border-primary rounded-sm': isHighlighted,
        })}
      >
        <div className="flex items-center">
          {displayMissingCards && missingAmount > 0 && (
            <span className="text-red-500 text-xs w-[15px]">
              {deckCard.quantity - missingAmount}
            </span>
          )}
          {editable ? (
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
              group: editable && !isMobile,
            },
          )}
          onClick={() => {
            void navigate({
              to: '.',
              search: prev => ({ ...prev, modalCardId: deckCard.cardId }),
            });
          }}
        >
          <span
            className={cn('max-w-[220px] truncate ellipsis overflow-hidden whitespace-nowrap', {
              'group-hover:hidden': editable,
              'text-xs': variant === 'compact',
            })}
          >
            {card?.name}
          </span>
          <div className="flex gap-2 justify-end">
            {displayDeckPrice && (
              <div className={cn(editable && 'group-hover:hidden')}>
                <DeckCardPriceBadge card={card} displayTooltip={true} />
              </div>
            )}
            <div
              className={cn('flex gap-0 w-[50px] justify-end', {
                'group-hover:hidden': editable,
              })}
            >
              {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="xSmall" /> : null}
              {card?.aspects.map((a, i) => (
                <AspectIcon key={`${a}${i}`} aspect={a} size="xSmall" />
              ))}
            </div>
            {editable && (
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
          editable={editable}
          cardInBoards={cardInBoards}
          onQuantityChange={quantityChangeHandler}
        />
      </div>
    </DeckCardHoverImage>
  );
};

export default DeckCardTextRow;
