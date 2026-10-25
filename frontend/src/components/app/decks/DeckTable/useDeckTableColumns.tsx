import { useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { MoreHorizontal } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { getFormatName, UserDeckData } from './deckTableLib.tsx';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import { DataTableViewMode, ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import { deckPrivacyRenderer } from '@/lib/table/deckPrivacyRenderer.tsx';
import { EntityPriceBadge } from '@/components/app/card-prices/EntityPriceBadge.tsx';
import { getPriceSourceSortValue } from '../../../../../../shared/lib/card-prices/source-type-sorters.ts';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

// A stable cell component keeps an open preview mounted as catalog/mutation data changes.
const renderDeckOwner: ExtendedColumnDef<UserDeckData>['cell'] = ({ row }) => (
  <UserDisplay user={row.original.user} />
);

interface DeckTableColumnsProps {
  view?: DataTableViewMode;
  isCompactBoxView?: boolean; // applies only in Box view
  showOwner?: boolean;
  showPublic?: boolean;
  showSelection?: boolean;
  selectionLimit?: number;
}

export function useDeckTableColumns({
  view = 'table',
  isCompactBoxView = false,
  showOwner,
  showPublic,
  showSelection,
  selectionLimit,
}: DeckTableColumnsProps): ExtendedColumnDef<UserDeckData>[] {
  const putDeckMutation = usePutDeck(undefined);

  return useMemo(() => {
    const definitions: ExtendedColumnDef<UserDeckData>[] = [];

    if (showSelection) {
      definitions.push({
        id: 'select',
        size: 8,
        displayBoxHeader: false,
        header: ({ table }) => {
          const eligibleRows = table
            .getRowModel()
            .rows.slice(0, selectionLimit ?? Number.MAX_SAFE_INTEGER);
          const allEligibleRowsSelected =
            eligibleRows.length > 0 && eligibleRows.every(row => row.getIsSelected());
          const someRowsSelected = table.getSelectedRowModel().rows.length > 0;

          return (
            <Checkbox
              checked={allEligibleRowsSelected ? true : someRowsSelected ? 'indeterminate' : false}
              onCheckedChange={checked => {
                table.setRowSelection(
                  checked === true
                    ? Object.fromEntries(eligibleRows.map(row => [row.id, true]))
                    : {},
                );
              }}
              aria-label={`Select up to ${selectionLimit ?? eligibleRows.length} loaded decks`}
            />
          );
        },
        cell: ({ row, table }) => (
          <div className={cn('flex items-center', { 'justify-end': view === 'box' })}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={checked => row.toggleSelected(checked === true)}
              onClick={event => event.stopPropagation()}
              disabled={
                selectionLimit !== undefined &&
                !row.getIsSelected() &&
                table.getSelectedRowModel().rows.length >= selectionLimit
              }
              aria-label={`Select ${row.original.deck.name}`}
            />
          </div>
        ),
      });
    }

    // Leader and Base cards
    definitions.push({
      id: 'leaders',
      header: 'Leaders/Base',
      size: 24,
      displayBoxHeader: false,
      cell: ({ row }) => {
        const deck = row.original.deck;

        return (
          <div className={cn('flex min-h-[76px] px-1 py-4', { 'justify-center': view === 'box' })}>
            <DeckArtwork
              leaderId={deck.leaderCardId1}
              leader2Id={deck.leaderCardId2}
              baseId={deck.baseCardId}
            />
          </div>
        );
      },
    });

    definitions.push({
      id: 'deckName',
      accessorKey: 'deck.name',
      header: 'Name',
      displayBoxHeader: false,
      cell: ({ getValue, row }) => {
        const name = getValue() as string;
        const deckId = row.original.deck.id as string;

        return (
          <Link
            to={'/decks/' + deckId}
            className={cn('flex flex-col gap-1 py-2 w-full items-start justify-center text-left', {
              'items-center': view === 'box',
            })}
          >
            <span
              className={cn('font-semibold [overflow-wrap:anywhere]', {
                'max-w-[70vw] text-center': view === 'box',
              })}
            >
              {name}
            </span>
            {row.original.deck.description && (
              <span
                className={cn(
                  'text-xs font-normal text-muted-foreground max-w-80 line-clamp-2 [overflow-wrap:anywhere]',
                  {
                    'max-w-[70vw] text-center': view === 'box',
                  },
                )}
              >
                {row.original.deck.description}
              </span>
            )}
          </Link>
        );
      },
    });

    // Price column (before Public)
    definitions.push({
      id: 'deckPrice',
      header: 'Price',
      size: 24,
      displayInBoxView: !isCompactBoxView,
      cell: ({ row }) => {
        const prices = row.original.entityPrices ?? [];
        prices.sort(
          (a, b) => getPriceSourceSortValue(a.sourceType) - getPriceSourceSortValue(b.sourceType),
        );
        return (
          <div className={cn('flex gap-1 items-center', { 'justify-center': view === 'box' })}>
            {prices.map(p => (
              <EntityPriceBadge
                entityPrice={p}
                sourceType={p.sourceType}
                entityUpdatedAt={row.original.deck.updatedAt}
              />
            ))}
          </div>
        );
      },
    });

    if (showPublic) {
      definitions.push({
        id: 'deckPublic',
        accessorKey: 'deck.public',
        header: 'Public',
        size: 20,
        displayInBoxView: !isCompactBoxView,
        cell: ({ getValue, row }) => {
          const deckId = row.original.deck.id as string;
          const deckPrivacy = getValue() as number;
          return deckPrivacyRenderer(deckPrivacy, () => {
            putDeckMutation.mutate({
              deckId: deckId,
              public: (deckPrivacy + 1) % 3,
            });
          });
        },
      });
    }

    definitions.push({
      id: 'deckFormat',
      accessorKey: 'deck.format',
      header: 'Format',
      size: 24,
      displayInBoxView: !isCompactBoxView,
      cell: ({ getValue }) => {
        const format = getValue() as number;
        return <div className="text-sm">{getFormatName(format)}</div>;
      },
    });

    if (showOwner) {
      definitions.push({
        accessorKey: 'user.displayName',
        header: 'Owner',
        size: 40,
        cell: renderDeckOwner,
      });
    }

    definitions.push({
      accessorKey: 'deck.updatedAt',
      size: 24,
      displayInBoxView: !isCompactBoxView,
      header: view === 'box' ? 'Updated' : () => <div className="text-right">Updated</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      id: 'actions',
      size: 12,
      header: view === 'box' ? 'asdf' : () => <div className="text-right">Actions</div>,
      displayBoxHeader: false,
      displayInBoxView: !isCompactBoxView,
      cell: ({ row }) => {
        const deckId = row.original.deck.id;
        const userId = row.original.user.id;

        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <div className="text-right">
                <Button variant="ghost" size="iconMedium" className="p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(`${window.location.origin}/decks/${deckId}`)
                }
              >
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(deckId)}>
                Copy deck ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(userId)}>
                Copy user ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return definitions;
  }, [
    putDeckMutation,
    view,
    isCompactBoxView,
    showSelection,
    showOwner,
    showPublic,
    selectionLimit,
  ]);
}
