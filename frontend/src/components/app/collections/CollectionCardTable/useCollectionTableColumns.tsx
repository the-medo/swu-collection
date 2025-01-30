import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { MoreHorizontal } from 'lucide-react';
import { useCurrencyList } from '@/api/useCurrencyList.ts';
import { useCountryList } from '@/api/useCountryList.ts';
import { CountryCode, CurrencyCode } from '../../../../../../server/db/lists.ts';
import { Link } from '@tanstack/react-router';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import { CollectionTableData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';

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
}: CollectionTableColumnsProps): ColumnDef<CollectionTableData>[] {
  const { data: currencyData } = useCurrencyList();
  const { data: countryData } = useCountryList();

  return useMemo(() => {
    const definitions: ColumnDef<CollectionTableData>[] = [];

    if (showPublic) {
      definitions.push({
        id: 'collectionPublic',
        accessorKey: 'collection.public',
        header: 'Public',
        cell: ({ getValue }) => {
          return publicRenderer(getValue() as boolean);
        },
      });
    }

    definitions.push({
      id: 'collectionTitle',
      accessorKey: 'collection.title',
      header: 'Title',
      cell: ({ getValue, row }) => {
        const title = getValue() as string;
        const collectionId = row.original.collection.id as string; //.getValue('collection.id') doesn't work??

        return (
          <Link to={'/collections/' + collectionId} className="font-bold">
            <Button variant="link" className="w-full justify-start">
              {title}
            </Button>
          </Link>
        );
      },
    });

    if (showOwner) {
      definitions.push({
        accessorKey: 'user.displayName',
        header: 'Owner',
        cell: ({ getValue, row }) => {
          const userId = row.original.user.id as string;
          const displayName = getValue() as string;
          return (
            <Link to={'/user/' + userId} className="text-xs">
              {displayName}
            </Link>
          );
        },
      });
    }

    if (showState) {
      definitions.push({
        accessorKey: 'user.country',
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
      header: () => <div className="text-right">Created At</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      accessorKey: 'collection.updatedAt',
      header: () => <div className="text-right">Updated At</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const collectionId = row.original.collection.id;
        const userId = row.original.user.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="text-right">
                <Button variant="ghost" className="h-8 w-8 p-0 text-right">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(collectionId)}>
                Copy collection ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(userId)}>
                Copy user ID
              </DropdownMenuItem>
              {/*<DropdownMenuSeparator />
              <DropdownMenuItem>View customer</DropdownMenuItem>
              <DropdownMenuItem>View payment details</DropdownMenuItem>*/}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return definitions;
  }, [countryData, currencyData]);
}
