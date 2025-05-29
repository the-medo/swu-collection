import { useMemo } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getDeckKey } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { cn } from '@/lib/utils.ts';
import { DeckCardsInfo } from '@/components/app/card-stats/CardDecks/CardDecks.tsx';

export function useTournamentDeckTableColumns(
  showSelectionCheckbox?: boolean,
  showAdditionalDeckCardInfo?: boolean,
): ExtendedColumnDef<TournamentDeckResponse & DeckCardsInfo>[] {
  const labelRenderer = useLabel();
  const { data: cardListData } = useCardList();
  const isMobile = useIsMobile();

  return useMemo(() => {
    const definitions: ExtendedColumnDef<TournamentDeckResponse & DeckCardsInfo>[] = [];

    // Placement column or Checkbox column
    definitions.push({
      id: 'placement',
      header: '#',
      size: 8,
      cell: ({ row, table }) => {
        const placement = row.original.tournamentDeck.placement;

        if (showSelectionCheckbox) {
          // Show checkbox on hover when no rows are selected
          return (
            <div className="flex gap-1 items-center justify-between font-bold">
              <div
                className={cn('placement-number', {
                  'group-hover:hidden': !isMobile && !table.getIsSomeRowsSelected(),
                  hidden: !isMobile && table.getIsSomeRowsSelected(),
                })}
              >
                {placement !== null ? `#${placement}` : 'N/A'}
              </div>
              <div
                className={cn('justify-center items-center h-[16px]', {
                  'group-hover:flex hidden': !isMobile && !table.getIsSomeRowsSelected(),
                })}
              >
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={checked => {
                    row.toggleSelected(!!checked);
                  }}
                  onClick={e => e.stopPropagation()}
                  aria-label="Select row"
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          );
        }

        return (
          <div className="text-center font-bold">
            {placement !== null ? `#${placement}` : 'N/A'}
          </div>
        );
      },
    });

    // Deck label column
    definitions.push({
      id: 'deck',
      header: 'Deck',
      cell: ({ row }) => {
        const tournamentDeck = row.original;
        if (!tournamentDeck) return 'N/A';

        const key = getDeckKey(tournamentDeck, 'leadersAndBase', cardListData);

        return (
          <div className="hover:underline w-48 text-xs">
            {labelRenderer(key, 'leadersAndBase', 'compact')}
          </div>
        );
      },
    });

    // Score column
    definitions.push({
      id: 'score',
      header: 'Score',
      size: 16,
      cell: ({ row }) => {
        const td = row.original.tournamentDeck;
        return (
          <div className="text-center text-xs">
            {td.recordWin}-{td.recordLose}-{td.recordDraw}
          </div>
        );
      },
    });

    // Player name column
    definitions.push({
      id: 'player',
      header: 'Player',
      size: 24,
      cell: ({ row }) => {
        const username = row.original.tournamentDeck.meleePlayerUsername;
        if (!username) return 'N/A';

        return <div className="text-[10px]">{username}</div>;
      },
    });

    if (showAdditionalDeckCardInfo) {
      // Maindeck count column
      definitions.push({
        id: 'mainDeck',
        header: 'MD',
        size: 8,
        cell: ({ row }) => {
          const dc = row.original.deckCards?.find(d => d.board === 1);
          return <div className="text-center text-xs">{!dc ? 0 : dc.quantity}</div>;
        },
      });

      // Sideboard count column
      definitions.push({
        id: 'sideBoard',
        header: 'SB',
        size: 8,
        cell: ({ row }) => {
          const dc = row.original.deckCards?.find(d => d.board === 2);
          return <div className="text-center text-xs">{!dc ? 0 : dc.quantity}</div>;
        },
      });
    }

    return definitions;
  }, [labelRenderer, cardListData, isMobile]);
}
