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
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getFormatName, UserDeckData } from './deckTableLib.tsx';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { useCurrencyList } from '@/api/lists/useCurrencyList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';
import { DataTableViewMode, ExtendedColumnDef } from '@/components/ui/data-table.tsx';

interface DeckTableColumnsProps {
  view?: DataTableViewMode;
  isCompactBoxView?: boolean; // applies only in Box view
  showOwner?: boolean;
  showPublic?: boolean;
}

export function useDeckTableColumns({
  view = 'table',
  isCompactBoxView = false,
  showOwner,
  showPublic,
}: DeckTableColumnsProps): ExtendedColumnDef<UserDeckData>[] {
  const user = useUser();
  const { data: currencyData } = useCurrencyList();
  const { data: countryData } = useCountryList();
  const { data: cardList } = useCardList();
  const putDeckMutation = usePutDeck(undefined);

  return useMemo(() => {
    const definitions: ExtendedColumnDef<UserDeckData>[] = [];

    // Leader and Base cards
    definitions.push({
      id: 'leaders',
      header: 'Leaders/Base',
      size: 24,
      displayBoxHeader: false,
      cell: ({ row }) => {
        const deck = row.original.deck;

        const leader1 = deck.leaderCardId1 ? cardList?.cards[deck.leaderCardId1] : undefined;
        const leader2 = deck.leaderCardId2 ? cardList?.cards[deck.leaderCardId2] : undefined;
        const base = deck.baseCardId ? cardList?.cards[deck.baseCardId] : undefined;

        return (
          <div
            className={cn('flex gap-1', {
              'justify-center': view === 'box',
            })}
          >
            <CardImage
              card={leader1}
              cardVariantId={leader1 ? selectDefaultVariant(leader1) : undefined}
              forceHorizontal={true}
              size="w100"
              backSideButton={false}
            >
              No leader
            </CardImage>
            {leader2 && (
              <div className="-ml-14">
                <CardImage
                  card={leader2}
                  cardVariantId={leader1 ? selectDefaultVariant(leader2) : undefined}
                  forceHorizontal={true}
                  size="w100"
                  backSideButton={false}
                />
              </div>
            )}
            <div className={cn({ '-ml-12': !!leader2 })}>
              <CardImage
                card={base}
                cardVariantId={base ? selectDefaultVariant(base) : undefined}
                forceHorizontal={true}
                size="w100"
                backSideButton={false}
              >
                No base
              </CardImage>
            </div>
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
          <Link to={'/decks/' + deckId} className="font-bold">
            <Button
              variant="link"
              className={cn('flex flex-col gap-0 p-0 w-full items-start justify-center', {
                'items-center': view === 'box',
              })}
            >
              <span
                className={cn({
                  'truncate ellipsis max-w-[75vw]': view === 'box',
                })}
              >
                {name}
              </span>
              {row.original.deck.description && (
                <span
                  className={cn(
                    'text-xs font-normal italic max-w-80 truncate ellipsis overflow-hidden whitespace-nowrap',
                    {
                      'truncate ellipsis max-w-[75vw]': view === 'box',
                    },
                  )}
                >
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

    definitions.push({
      accessorKey: 'deck.updatedAt',
      size: 24,
      displayInBoxView: !isCompactBoxView,
      header: view === 'box' ? 'Updated' : () => <div className="text-right">Updated</div>,
      cell: ({ getValue }) => {
        return dateRenderer(getValue() as string);
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
          return publicRenderer(getValue() as boolean, () => {
            putDeckMutation.mutate({
              deckId: deckId,
              public: !(getValue() as boolean),
            });
          });
        },
      });
    }

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
  }, [cardList, countryData, currencyData, putDeckMutation, user, view, isCompactBoxView]);
}
