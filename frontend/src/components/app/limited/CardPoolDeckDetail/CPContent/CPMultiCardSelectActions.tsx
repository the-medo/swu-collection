import React, { useCallback, useMemo } from 'react';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { cn } from '@/lib/utils.ts';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useUpdateCardPoolDeckCard } from '@/api/card-pools/useUpdateCardPoolDeckCard.ts';

export interface CPMultiCardSelectActionsProps {
  cards: ExpandedCardData[];
  title?: string;
  // When provided, shows special single-option actions for these sections
  section?: 'deck' | 'trash';
  // Needed for server mutations in special section mode
  deckId?: string;
  poolId?: string;
  // Allow hiding inline select/deselect helpers (useful in headers)
  hideInlineSelectDeselect?: boolean;
}

const poolPredicate = (c: ExpandedCardData) => c.location === 'pool';
const deckPredicate = (c: ExpandedCardData) => c.location === 'deck';
const trashPredicate = (c: ExpandedCardData) => c.location === 'trash';
const unfilteredPredicate = (c: ExpandedCardData) => !c.filterSuccess;

const CPMultiCardSelectActions: React.FC<CPMultiCardSelectActionsProps> = ({
  cards,
  title,
  section,
  deckId,
  poolId,
  hideInlineSelectDeselect,
}) => {
  const { selectManyCardIds, deselectManyCardIds } = useCardPoolDeckDetailStoreActions();
  const { showCardsInDeck, showRemovedCards, showUnfilteredCards } = useCardPoolDeckDetailStore();
  const mutation = useUpdateCardPoolDeckCard(poolId, deckId);

  const makeHandler = useCallback(
    (predicate: (c: ExpandedCardData) => boolean, action: 'select' | 'deselect') =>
      (e: React.MouseEvent | Event) => {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        const ids = cards.filter(predicate).map(c => c.cardPoolNumber);
        if (!ids.length) return;
        if (action === 'select') selectManyCardIds(ids);
        else deselectManyCardIds(ids);
      },
    [cards],
  );

  const selectDeselectButtons = useMemo(() => {
    if (hideInlineSelectDeselect) return null;

    const inlineIds = cards
      .filter(
        card =>
          card.location === 'pool' ||
          (card.location === 'deck' && showCardsInDeck) ||
          (card.location === 'trash' && showRemovedCards),
      )
      .map(card => card.cardPoolNumber);

    const onInlineSelect = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (inlineIds.length) selectManyCardIds(inlineIds);
    };

    const onInlineDeselect = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (inlineIds.length) deselectManyCardIds(inlineIds);
    };

    return (
      <div className={cn('inline-flex items-center gap-1 text-[11px] leading-none select-none')}>
        <button
          type="button"
          onClick={onInlineSelect}
          className="underline underline-offset-2 cursor-pointer opacity-80 hover:opacity-100 mr-1"
        >
          Select
        </button>
        <span className="opacity-60">/</span>
        <button
          type="button"
          onClick={onInlineDeselect}
          className="underline underline-offset-2 cursor-pointer opacity-80 hover:opacity-100 ml-1"
        >
          Deselect
        </button>
      </div>
    );
  }, [cards, showCardsInDeck, showRemovedCards, hideInlineSelectDeselect]);

  const moveAllToPool = useCallback(
    async (e: Event) => {
      if ('stopPropagation' in e && typeof e.stopPropagation === 'function') e.stopPropagation();
      const ids = cards.map(c => c.cardPoolNumber);
      if (!ids.length || !poolId || !deckId) return;
      await mutation.mutateAsync({ cardPoolNumbers: ids, location: 'pool' });
    },
    [cards],
  );

  return (
    <div className={'flex flex-col gap-2 pb-2'}>
      <div className={'flex flex-1 items-center justify-between gap-2'}>
        {title ? (
          <div className="text-xs font-medium opacity-80">{title}</div>
        ) : (
          selectDeselectButtons
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className={cn('h-6 w-6 p-0.5 inline-flex items-center justify-center')}
              onClick={e => e.stopPropagation()}
              aria-label="Card multi-select actions"
            >
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} onClick={e => e.stopPropagation()}>
            {section ? (
              <DropdownMenuItem onSelect={moveAllToPool}>
                Remove all cards from {section}
              </DropdownMenuItem>
            ) : (
              <>
                {/* Pool Section - always visible */}
                <DropdownMenuLabel>Pool</DropdownMenuLabel>
                <DropdownMenuItem onSelect={makeHandler(poolPredicate, 'select')}>
                  Select all
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={makeHandler(poolPredicate, 'deselect')}>
                  Deselect all
                </DropdownMenuItem>

                {(showCardsInDeck || showRemovedCards || showUnfilteredCards) && (
                  <DropdownMenuSeparator />
                )}

                {/* Deck Section */}
                {showCardsInDeck && (
                  <>
                    <DropdownMenuLabel>Deck</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={makeHandler(deckPredicate, 'select')}>
                      Select all
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={makeHandler(deckPredicate, 'deselect')}>
                      Deselect all
                    </DropdownMenuItem>
                  </>
                )}

                {showCardsInDeck && (showRemovedCards || showUnfilteredCards) && (
                  <DropdownMenuSeparator />
                )}

                {/* Trash Section */}
                {showRemovedCards && (
                  <>
                    <DropdownMenuLabel>Trash</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={makeHandler(trashPredicate, 'select')}>
                      Select all
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={makeHandler(trashPredicate, 'deselect')}>
                      Deselect all
                    </DropdownMenuItem>
                  </>
                )}

                {showRemovedCards && showUnfilteredCards && <DropdownMenuSeparator />}

                {/* Unfiltered Section */}
                {showUnfilteredCards && (
                  <>
                    <DropdownMenuLabel>Unfiltered</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={makeHandler(unfilteredPredicate, 'select')}>
                      Select all
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={makeHandler(unfilteredPredicate, 'deselect')}>
                      Deselect all
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {title ? selectDeselectButtons : null}
    </div>
  );
};

export default CPMultiCardSelectActions;
