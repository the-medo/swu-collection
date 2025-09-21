import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MissingCardsRowData } from './missingCardsTableLib.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import FinalInput from '../FinalInput';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      header: 'Card',
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
                <div className="flex flex-1 gap-2 text-[10px] text-muted-foreground @[550px]/missing-cards-table:hidden flex-wrap">
                  <div className="flex gap-1">
                    <span className="font-semibold">C(D)</span>
                    <span>{row.original.ownedQuantity?.deckCollection}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="font-semibold">C(O)</span>
                    <span>{row.original.ownedQuantity?.nonDeckCollection}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="font-semibold">WL</span>
                    <span>{row.original.ownedQuantity?.wantlist}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="font-semibold">OL</span>
                    <span>{row.original.ownedQuantity?.cardlist}</span>
                  </div>
                </div>
              </div>
            </div>
          </DeckCardHoverImage>
        );
      },
      minSize: 120,
    });

    // Uniform numeric columns
    const numericCell = (val?: number) => {
      const v = val ?? 0;
      const strong = v > 0 ? 'font-semibold' : '';
      return (
        <div
          className={`w-full px-1 text-right ${strong} hidden @[550px]/missing-cards-table:block`}
        >
          {v}
        </div>
      );
    };

    const uniformSize = 0;

    cols.push({
      id: 'ownedDeck',
      header: () => (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden @[550px]/missing-cards-table:inline px-1">CD</span>
            </TooltipTrigger>
            <TooltipContent side="top">Total "Collection (for decks)" amount</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      accessorFn: r => r.ownedQuantity?.deckCollection ?? 0,
      size: uniformSize,
      cell: ({ row }) => numericCell(row.original.ownedQuantity?.deckCollection),
    });

    cols.push({
      id: 'ownedNonDeck',
      header: () => (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden @[550px]/missing-cards-table:inline px-1">CO</span>
            </TooltipTrigger>
            <TooltipContent side="top">Total "Collection (NOT for decks)" amount</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      accessorFn: r => r.ownedQuantity?.nonDeckCollection ?? 0,
      size: uniformSize,
      cell: ({ row }) => numericCell(row.original.ownedQuantity?.nonDeckCollection),
    });

    cols.push({
      id: 'want',
      header: () => (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden @[550px]/missing-cards-table:inline px-1">WL</span>
            </TooltipTrigger>
            <TooltipContent side="top">Total "Wantlist" amount</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      accessorFn: r => r.ownedQuantity?.wantlist ?? 0,
      size: uniformSize,
      cell: ({ row }) => numericCell(row.original.ownedQuantity?.wantlist),
    });

    cols.push({
      id: 'cardlist',
      header: () => (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden @[550px]/missing-cards-table:inline px-1">OL</span>
            </TooltipTrigger>
            <TooltipContent side="top">Total "Other lists" amount</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      accessorFn: r => r.ownedQuantity?.cardlist ?? 0,
      size: uniformSize,
      cell: ({ row }) => numericCell(row.original.ownedQuantity?.cardlist),
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
