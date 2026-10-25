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
import { LinkIcon, MoreHorizontal, PencilIcon, TrashIcon } from 'lucide-react';
import { useCurrencyList } from '@/api/lists/useCurrencyList.ts';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { CountryCode, CurrencyCode } from '../../../../../../server/db/lists.ts';
import { Link } from '@tanstack/react-router';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { usePutCollection } from '@/api/collections/usePutCollection.ts';
import { useUser } from '@/hooks/useUser.ts';
import DeleteCollectionDialog from '@/components/app/dialogs/DeleteCollectionDialog.tsx';
import EditCollectionDialog from '@/components/app/dialogs/EditCollectionDialog.tsx';
import { DataTableViewMode, ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import { forSaleRenderer } from '@/lib/table/forSaleRenderer.tsx';
import { forDecksRenderer } from '@/lib/table/forDecksRenderer.tsx';
import { getPriceSourceSortValue } from '../../../../../../shared/lib/card-prices/source-type-sorters.ts';
import { cn } from '@/lib/utils.ts';
import EntityPriceBadge from '@/components/app/card-prices/EntityPriceBadge.tsx';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

type CollectionOwnerMeta = {
  view?: DataTableViewMode;
  showState?: boolean;
  renderState: Exclude<ExtendedColumnDef<UserCollectionData>['cell'], string | undefined>;
};

// Keep the identity mounted when country/currency data or mutation state refreshes.
const renderCollectionOwner: ExtendedColumnDef<UserCollectionData>['cell'] = context => {
  const { view, showState, renderState } = context.column.columnDef.meta as CollectionOwnerMeta;
  const identity = <UserDisplay user={context.row.original.user} />;
  return showState && view === 'box' ? (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
      {identity}
      {renderState(context)}
    </div>
  ) : (
    identity
  );
};

interface CollectionTableColumnsProps {
  view?: DataTableViewMode;
  showOwner?: boolean;
  showPublic?: boolean;
  showForSale?: boolean;
  showForDecks?: boolean;
  showState?: boolean;
  showCurrency?: boolean;
  showCollectionPrice?: boolean;
}

export function useCollectionTableColumns({
  view,
  showOwner,
  showPublic,
  showForSale,
  showForDecks,
  showState,
  showCurrency,
  showCollectionPrice,
}: CollectionTableColumnsProps): ExtendedColumnDef<UserCollectionData>[] {
  const user = useUser();
  const { data: currencyData } = useCurrencyList();
  const { data: countryData } = useCountryList();
  const putCollectionMutation = usePutCollection();

  return useMemo(() => {
    const definitions: ExtendedColumnDef<UserCollectionData>[] = [];

    definitions.push({
      id: 'collectionTitle',
      accessorKey: 'collection.title',
      header: 'Title',
      displayBoxHeader: false,
      cell: ({ getValue, row }) => {
        const title = getValue() as string;
        const collectionId = row.original.collection.id as string;

        return (
          <Link
            to={'/collections/' + collectionId}
            className="flex w-full max-w-full items-center gap-3 text-left"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="max-w-[min(18rem,60vw)] font-semibold [overflow-wrap:anywhere]">
                {title}
              </span>
              {row.original.collection.description && (
                <span className="line-clamp-2 max-w-[min(18rem,60vw)] text-xs font-normal text-muted-foreground [overflow-wrap:anywhere]">
                  {row.original.collection.description}
                </span>
              )}
            </span>
          </Link>
        );
      },
    });

    const stateRenderer: ExtendedColumnDef<UserCollectionData>['cell'] = ({ row }) => {
      const countryCode = row.original.user.country as CountryCode | null;
      const state = row.original.user.state as string | null;
      const country = countryCode ? countryData?.countries[countryCode] : undefined;

      return (
        <div className="justify-end flex items-center gap-2 text-xs">
          {country?.name ?? ' - '}
          {state ? ` | ${state}` : ''}
          {countryCode && <img src={country?.flag} alt={country?.code} className="w-6" />}
        </div>
      );
    };

    if (showOwner) {
      definitions.push({
        accessorKey: 'user.displayName',
        header: 'Owner',
        size: 40,
        displayBoxHeader: false,
        meta: { view, showState, renderState: stateRenderer } satisfies CollectionOwnerMeta,
        cell: renderCollectionOwner,
      });
    }

    if (showCollectionPrice) {
      definitions.push({
        id: 'collectionPrice',
        header: 'Price',
        size: 24,
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
                  entityUpdatedAt={row.original.collection.updatedAt}
                />
              ))}
            </div>
          );
        },
      });
    }

    if (showPublic) {
      definitions.push({
        id: 'collectionPublic',
        accessorKey: 'collection.public',
        header: 'Public',
        size: 20,
        cell: ({ getValue, row }) => {
          const userId = row.original.user.id as string;
          const collectionId = row.original.collection.id as string;

          return publicRenderer(
            getValue() as boolean,
            user?.id === userId
              ? () => {
                  putCollectionMutation.mutate({
                    collectionId: collectionId,
                    public: !(getValue() as boolean),
                  });
                }
              : undefined,
          );
        },
      });
    }

    if (showForSale) {
      definitions.push({
        id: 'collectionForSale',
        accessorKey: 'collection.forSale',
        header: 'For sale',
        size: 32,
        cell: ({ getValue, row }) => {
          const userId = row.original.user.id as string;
          const collectionId = row.original.collection.id as string;
          return forSaleRenderer(
            getValue() as boolean,
            user?.id === userId
              ? () => {
                  putCollectionMutation.mutate({
                    collectionId: collectionId,
                    forSale: !(getValue() as boolean),
                  });
                }
              : undefined,
          );
        },
      });
    }

    if (showForDecks) {
      definitions.push({
        id: 'collectionForDecks',
        accessorKey: 'collection.forDecks',
        header: 'For decks',
        size: 32,
        cell: ({ getValue, row }) => {
          const userId = row.original.user.id as string;
          const collectionId = row.original.collection.id as string;
          return forDecksRenderer(
            getValue() as boolean,
            user?.id === userId
              ? () => {
                  putCollectionMutation.mutate({
                    collectionId: collectionId,
                    forDecks: !(getValue() as boolean),
                  });
                }
              : undefined,
          );
        },
      });
    }

    if (showState) {
      definitions.push({
        accessorKey: 'user.country',
        size: 40,
        displayInBoxView: false,
        header: () => <div className="text-right">Location</div>,
        cell: stateRenderer,
      });
    }

    if (showCurrency) {
      definitions.push({
        accessorKey: 'user.currency',
        header: 'Currency',
        size: 24,
        displayInBoxView: false,
        cell: ({ row }) => {
          const currencyCode = row.original.user.currency as CurrencyCode;
          const currency = currencyData?.currencies[currencyCode];

          return (
            <div>
              {currency?.code} ({currency?.symbol})
            </div>
          );
        },
      });
    }

    definitions.push({
      accessorKey: 'collection.updatedAt',
      size: 24,
      header: () => <div className="text-right">Updated</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      id: 'actions',
      size: 12,
      header: () => <div className="text-right">Actions</div>,
      displayBoxHeader: false,
      cell: ({ row }) => {
        const collectionId = row.original.collection.id;
        const userId = row.original.user.id;

        return (
          <div className="flex gap-1 justify-end">
            <Button
              size="iconMedium"
              variant="ghost"
              className="p-0"
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/collections/${collectionId}`,
                )
              }
            >
              <span className="sr-only">Copy link</span>
              <LinkIcon className="h-4 w-4" />
            </Button>
            {user && user?.id === userId && (
              <>
                <EditCollectionDialog
                  collection={row.original.collection}
                  trigger={
                    <Button variant="ghost" size="iconMedium" className="p-0">
                      <span className="sr-only">Edit collection</span>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  }
                />
                <DeleteCollectionDialog
                  collection={row.original.collection}
                  trigger={
                    <Button variant="ghost" size="iconMedium" className="p-0 text-destructive">
                      <span className="sr-only">Delete collection</span>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  }
                />
              </>
            )}
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
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(collectionId)}>
                  Copy collection ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(userId)}>
                  Copy user ID
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return definitions;
  }, [countryData, currencyData, view, showOwner, showPublic, showState, showCurrency]);
}
