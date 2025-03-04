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
import { Link } from '@tanstack/react-router';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getFormatName, UserDeckData } from './deckTableLib.tsx';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { useCurrencyList } from '@/api/lists/useCurrencyList.ts';
import DeleteDeckDialog from '@/components/app/dialogs/DeleteDeckDialog.tsx';

interface DeckTableColumnsProps {
  showOwner?: boolean;
  showPublic?: boolean;
}

export function useDeckTableColumns({
  showOwner,
  showPublic,
}: DeckTableColumnsProps): ColumnDef<UserDeckData>[] {
  const user = useUser();
  const { data: currencyData } = useCurrencyList();
  const { data: countryData } = useCountryList();
  const { data: cardList } = useCardList();
  const putDeckMutation = usePutDeck(undefined);

  return useMemo(() => {
    const definitions: ColumnDef<UserDeckData>[] = [];

    if (showPublic) {
      definitions.push({
        id: 'deckPublic',
        accessorKey: 'deck.public',
        header: 'Public',
        size: 20,
        cell: ({ getValue, row }) => {
          const deckId = row.original.deck.id as string;
          return (
            <Button
              variant="link"
              className="flex flex-col gap-0 p-0 w-full items-start justify-center"
              onClick={() => {
                putDeckMutation.mutate({
                  id: deckId,
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
      id: 'deckName',
      accessorKey: 'deck.name',
      header: 'Name',
      cell: ({ getValue, row }) => {
        const name = getValue() as string;
        const deckId = row.original.deck.id as string;

        return (
          <Link to={'/decks/' + deckId} className="font-bold">
            <Button
              variant="link"
              className="flex flex-col gap-0 p-0 w-full items-start justify-center"
            >
              {name}
              {row.original.deck.description && (
                <span className="text-xs font-normal italic pl-4 max-w-80 truncate ellipsis overflow-hidden whitespace-nowrap">
                  {row.original.deck.description}
                </span>
              )}
            </Button>
          </Link>
        );
      },
    });

    definitions.push({
      id: 'deckFormat',
      accessorKey: 'deck.format',
      header: 'Format',
      size: 24,
      cell: ({ getValue }) => {
        const format = getValue() as number;
        return <div className="text-sm">{getFormatName(format)}</div>;
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

    // Leader and Base cards
    definitions.push({
      id: 'leaders',
      header: 'Leaders/Base',
      size: 24,
      cell: ({ row }) => {
        const deck = row.original.deck;
        const leaders = [];

        if (deck.leaderCardId1 && cardList?.cards[deck.leaderCardId1]) {
          leaders.push(cardList.cards[deck.leaderCardId1]?.name);
        }

        if (deck.leaderCardId2 && cardList?.cards[deck.leaderCardId2]) {
          leaders.push(cardList.cards[deck.leaderCardId2]?.name);
        }

        const base =
          deck.baseCardId && cardList?.cards[deck.baseCardId]
            ? cardList.cards[deck.baseCardId]?.name
            : null;

        return (
          <div className="text-xs">
            {leaders.length > 0 && <div>Leaders: {leaders.join(', ')}</div>}
            {base && <div>Base: {base}</div>}
          </div>
        );
      },
    });

    definitions.push({
      accessorKey: 'deck.createdAt',
      size: 24,
      header: () => <div className="text-right">Created At</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
      },
    });

    definitions.push({
      accessorKey: 'deck.updatedAt',
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
        const deckId = row.original.deck.id;
        const userId = row.original.user.id;

        return (
          <div className="flex gap-1">
            <Button
              size="iconMedium"
              className="p-0"
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}/decks/${deckId}`)
              }
            >
              <span className="sr-only">Copy link</span>
              <LinkIcon className="h-4 w-4" />
            </Button>
            {user && user?.id === userId && (
              <>
                <Link to={`/decks/$deckId`} params={{ deckId: deckId }}>
                  <Button size="iconMedium" className="p-0">
                    <span className="sr-only">Edit deck</span>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </Link>
                <DeleteDeckDialog
                  deck={row.original.deck}
                  trigger={
                    <Button variant="destructive" size="iconMedium" className="p-0">
                      <span className="sr-only">Delete deck</span>
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
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(deckId)}>
                  Copy deck ID
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
  }, [cardList, countryData, currencyData, putDeckMutation, user]);
}
