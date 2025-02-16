import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
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
import { useCurrencyList } from '@/api/useCurrencyList.ts';
import { useCountryList } from '@/api/useCountryList.ts';
import { CountryCode, CurrencyCode } from '../../../../../../server/db/lists.ts';
import { Link } from '@tanstack/react-router';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { usePutCollection } from '@/api/usePutCollection.ts';
import { useUser } from '@/hooks/useUser.ts';
import DeleteCollectionDialog from '@/components/app/dialogs/DeleteCollectionDialog.tsx';
import EditCollectionDialog from '@/components/app/dialogs/EditCollectionDialog.tsx';

interface CollectionTableColumnsProps {
  showOwner?: boolean;
  showPublic?: boolean;
  showState?: boolean;
  showCurrency?: boolean;
}

export function useCollectionTableColumns({
  showOwner,
  showPublic,
  showState,
  showCurrency,
}: CollectionTableColumnsProps): ColumnDef<UserCollectionData>[] {
  const user = useUser();
  const { data: currencyData } = useCurrencyList();
  const { data: countryData } = useCountryList();
  const putCollectionMutation = usePutCollection();

  return useMemo(() => {
    const definitions: ColumnDef<UserCollectionData>[] = [];

    if (showPublic) {
      definitions.push({
        id: 'collectionPublic',
        accessorKey: 'collection.public',
        header: 'Public',
        size: 20,
        cell: ({ getValue, row }) => {
          const collectionId = row.original.collection.id as string;
          return (
            <Button
              variant="link"
              className="flex flex-col gap-0 p-0 w-full items-start justify-center"
              onClick={() => {
                putCollectionMutation.mutate({
                  collectionId: collectionId,
                  public: !(getValue() as boolean),
                });
              }}
            >
              {publicRenderer(getValue() as boolean)}
            </Button>
          );
        },
      });
    }

    definitions.push({
      id: 'collectionTitle',
      accessorKey: 'collection.title',
      header: 'Title',
      cell: ({ getValue, row }) => {
        const title = getValue() as string;
        const collectionId = row.original.collection.id as string;

        return (
          <Link to={'/collections/' + collectionId} className="font-bold">
            <Button
              variant="link"
              className="flex flex-col gap-0 p-0 w-full items-start justify-center"
            >
              {title}
              {row.original.collection.description && (
                <span className="text-xs font-normal italic pl-4 max-w-80 truncate ellipsis overflow-hidden whitespace-nowrap">
                  {row.original.collection.description}
                </span>
              )}
            </Button>
          </Link>
        );
      },
    });

    if (showOwner) {
      definitions.push({
        accessorKey: 'user.displayName',
        header: 'Owner',
        size: 64,
        cell: ({ getValue, row }) => {
          const userId = row.original.user.id as string;
          const displayName = getValue() as string;
          return (
            <Link to={'/users/' + userId} className="text-xs">
              {displayName}
            </Link>
          );
        },
      });
    }

    if (showState) {
      definitions.push({
        accessorKey: 'user.country',
        size: 64,
        header: () => <div className="text-right">Country and State / Region</div>,
        cell: ({ row }) => {
          const countryCode = row.original.user.country as CountryCode | null;
          const state = row.original.user.state as string | null;
          const country = countryCode ? countryData?.countries[countryCode] : undefined;

          return (
            <div className="justify-end flex items-center gap-2 text-xs">
              {countryCode && <img src={country?.flag} alt={country?.code} className="w-6" />}
              {country?.name ?? ' - '}
              {state ? ` | ${state}` : ''}
            </div>
          );
        },
      });
    }

    if (showCurrency) {
      definitions.push({
        accessorKey: 'user.currency',
        header: 'Currency',
        size: 24,
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
      accessorKey: 'collection.createdAt',
      size: 24,
      header: () => <div className="text-right">Created At</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      accessorKey: 'collection.updatedAt',
      size: 24,
      header: () => <div className="text-right">Updated At</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      id: 'actions',
      size: 12,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const collectionId = row.original.collection.id;
        const userId = row.original.user.id;

        return (
          <div className="flex gap-1">
            <Button
              size="iconMedium"
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
                    <Button size="iconMedium" className="p-0">
                      <span className="sr-only">Edit collection</span>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  }
                />
                <DeleteCollectionDialog
                  collection={row.original.collection}
                  trigger={
                    <Button variant="destructive" size="iconMedium" className="p-0">
                      <span className="sr-only">Delete collection</span>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  }
                />
              </>
            )}
            <DropdownMenu>
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
  }, [countryData, currencyData]);
}
