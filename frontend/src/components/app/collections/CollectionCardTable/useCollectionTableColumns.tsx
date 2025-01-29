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
import { MoreHorizontal } from 'lucide-react';
import { useCurrencyList } from '@/api/useCurrencyList.ts';
import { useCountryList } from '@/api/useCountryList.ts';
import { CountryCode, CurrencyCode } from '../../../../../../server/db/lists.ts';
import { Link } from '@tanstack/react-router';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import { CollectionTableData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';

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

    definitions.push({
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const title = row.getValue('title') as string;
        return (
          <Link to={'/collection/' + row.original.id} className="font-bold">
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
        cell: ({ row }) => {
          const user = row.original.user;
          if (!user) return <div className="text-xs">- unknown user -</div>;
          return (
            <Link to={'/user/' + user.id} className="text-xs">
              {user.displayName}
            </Link>
          );
        },
      });
    }

    if (showState) {
      definitions.push({
        accessorKey: 'user',
        header: () => <div className="text-right">Country and State / Region</div>,
        cell: ({ row }) => {
          const countryCode = row.original.user?.country as CountryCode | null;
          const state = row.original.user?.state as string | null;
          const country = countryCode ? countryData?.countries[countryCode] : undefined;

          return (
            <div className="justify-end flex items-center gap-2 text-xs">
              {countryCode && <img src={country?.flag} alt={country?.code} className="w-6" />}
              {country?.name ?? ' - '}
              {state ? ` / ${state}` : ''}
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
          const currencyCode = row.original.user?.currency as CurrencyCode;
          const currency = currencyData?.currencies[currencyCode];

          return (
            <div>
              {currency?.code} ({currency?.symbol})
            </div>
          );
        },
      });
    }

    if (showPublic) {
      definitions.push({
        accessorKey: 'public',
        header: 'Public',
        cell: ({ row }) => {
          return publicRenderer(row.getValue('public'));
        },
      });
    }

    definitions.push({
      accessorKey: 'createdAt',
      header: () => <div className="text-right">Created At</div>,
      cell: ({ row }) => {
        const value = new Date(row.getValue('createdAt'));
        const formatted = Intl.DateTimeFormat('en-US', {}).format(value);
        return <div className="text-right font-medium">{formatted}</div>;
      },
    });

    definitions.push({
      accessorKey: 'updatedAt',
      header: () => <div className="text-right">Updated At</div>,
      cell: ({ row }) => {
        return dateRenderer(row.getValue('updatedAt'));
      },
    });

    definitions.push({
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const payment = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id)}>
                Copy payment ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View customer</DropdownMenuItem>
              <DropdownMenuItem>View payment details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return definitions;
  }, [countryData, currencyData]);
}
