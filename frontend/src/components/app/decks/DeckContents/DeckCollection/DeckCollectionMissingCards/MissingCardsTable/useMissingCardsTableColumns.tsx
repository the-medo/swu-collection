import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MissingCardsRowData } from './missingCardsTableLib.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import FinalInput from '../FinalInput';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MissingCountSettingCheckbox from './MissingCountSettingCheckbox';
import NumericCell from './NumericCell';
import CardOwnershipMiniStats from './CardOwnershipMiniStats';

export function useMissingCardsTableColumns(): ColumnDef<MissingCardsRowData>[] {
  return useMemo(() => {
    const cols: ColumnDef<MissingCardsRowData>[] = [];

    // Quantity with prominent circle badge
    cols.push({
      id: 'qty',
      header: () => (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-1">Qty</span>
            </TooltipTrigger>
            <TooltipContent side="top">Total quantity in a deck, includes MD + SB</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      accessorFn: r => r.quantity,
      // size: 8,
      cell: ({ row }) => (
        <div className="px-1 w-full flex items-center justify-end">
          <div className="h-8 w-8 rounded-full bg-muted/30 text-foreground flex items-center justify-center text-base xfont-semibold">
            {row.original.quantity}
          </div>
        </div>
      ),
    });

    // Card with cost and aspects before name + hover image like CardCell
    cols.push({
      id: 'card',
      header: () => (
        <div className="flex items-center gap-2">
          <span>Card</span>
          {/* On narrow containers (<550px), show the 4 quick checkboxes here since their columns are hidden */}
          <div className="ml-8 flex gap-2 @[550px]/missing-cards-table:hidden">
            <div className="flex flex-col items-center">
              <MissingCountSettingCheckbox k="countCollectionsForDecks" />
              <span className="px-1">CD</span>
            </div>
            <div className="flex flex-col items-center">
              <MissingCountSettingCheckbox k="countCollectionsNotForDecks" />
              <span className="px-1">CO</span>
            </div>
            <div className="flex flex-col items-center">
              <MissingCountSettingCheckbox k="countWantlists" />
              <span className="px-1">WL</span>
            </div>
            <div className="flex flex-col items-center">
              <MissingCountSettingCheckbox k="countOtherLists" />
              <span className="px-1">OL</span>
            </div>
          </div>
        </div>
      ),
      accessorFn: r => r.card?.name ?? r.cardId,
      cell: ({ row }) => {
        const card = row.original.card;
        return (
          <DeckCardHoverImage card={card} size="w200">
            <div className="flex flex-1 items-center gap-2 min-w-[120px] cursor-help">
              <div className="gap-1 min-w-[64px] justify-start hidden @[400px]/missing-cards-table:flex">
                {card?.cost !== undefined && card?.cost !== null ? (
                  <CostIcon cost={card?.cost ?? 0} size="xSmall" />
                ) : null}
                {card?.aspects?.map((a, i) => (
                  <AspectIcon key={`${a}${i}`} aspect={a} size="xSmall" />
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="truncate flex-1 overflow-hidden  max-w-[200px] @[550px]/missing-cards-table:max-w-full">
                  {card?.name ?? row.original.cardId}
                </span>
                <CardOwnershipMiniStats owned={row.original.ownedQuantity} />
              </div>
            </div>
          </DeckCardHoverImage>
        );
      },
      minSize: 120,
    });

    // Uniform numeric columns are now rendered via NumericCell component

    const uniformSize = 0;

    cols.push({
      id: 'ownedDeck',
      header: () => (
        <div className="hidden @[550px]/missing-cards-table:flex flex-col items-center justify-center">
          <MissingCountSettingCheckbox k="countCollectionsForDecks" />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-1">CD</span>
              </TooltipTrigger>
              <TooltipContent side="top">Total "Collection (for decks)" amount</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      accessorFn: r => r.ownedQuantity?.deckCollection ?? 0,
      size: uniformSize,
      cell: ({ row }) => (
        <NumericCell
          val={row.original.ownedQuantity?.deckCollection}
          k="countCollectionsForDecks"
        />
      ),
    });

    cols.push({
      id: 'ownedNonDeck',
      header: () => (
        <div className="hidden @[550px]/missing-cards-table:flex flex-col items-center justify-center">
          <MissingCountSettingCheckbox k="countCollectionsNotForDecks" />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden @[550px]/missing-cards-table:inline px-1">CO</span>
              </TooltipTrigger>
              <TooltipContent side="top">Total "Collection (NOT for decks)" amount</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      accessorFn: r => r.ownedQuantity?.nonDeckCollection ?? 0,
      size: uniformSize,
      cell: ({ row }) => (
        <NumericCell
          val={row.original.ownedQuantity?.nonDeckCollection}
          k="countCollectionsNotForDecks"
        />
      ),
    });

    cols.push({
      id: 'want',
      header: () => (
        <div className="hidden @[550px]/missing-cards-table:flex flex-col items-center justify-center">
          <MissingCountSettingCheckbox k="countWantlists" />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden @[550px]/missing-cards-table:inline px-1">WL</span>
              </TooltipTrigger>
              <TooltipContent side="top">Total "Wantlist" amount</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      accessorFn: r => r.ownedQuantity?.wantlist ?? 0,
      size: uniformSize,
      cell: ({ row }) => (
        <NumericCell val={row.original.ownedQuantity?.wantlist} k="countWantlists" />
      ),
    });

    cols.push({
      id: 'cardlist',
      header: () => (
        <div className="hidden @[550px]/missing-cards-table:flex flex-col items-center justify-center">
          <MissingCountSettingCheckbox k="countOtherLists" />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden @[550px]/missing-cards-table:inline px-1">OL</span>
              </TooltipTrigger>
              <TooltipContent side="top">Total "Other lists" amount</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      accessorFn: r => r.ownedQuantity?.cardlist ?? 0,
      size: uniformSize,
      cell: ({ row }) => (
        <NumericCell val={row.original.ownedQuantity?.cardlist} k="countOtherLists" />
      ),
    });

    // Final column with mock component
    cols.push({
      id: 'final',
      header: () => (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>Final</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              Final amount of a card that will be added to collection / wantlist / card list
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      accessorFn: r => r.cardId,
      size: 16,
      cell: ({ row }) => <FinalInput cardId={row.original.cardId} />,
    });

    return cols;
  }, []);
}
