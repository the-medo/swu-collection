import { useMemo } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { Link } from '@tanstack/react-router';
import { ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getDeckKey } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useIsMobile } from '@/hooks/use-mobile.tsx';

export function useTournamentDeckTableColumns(): ExtendedColumnDef<TournamentDeckResponse>[] {
  const labelRenderer = useLabel();
  const { data: cardListData } = useCardList();
  const isMobile = useIsMobile();

  return useMemo(() => {
    const definitions: ExtendedColumnDef<TournamentDeckResponse>[] = [];

    // Placement column
    definitions.push({
      id: 'placement',
      header: '#',
      size: 16,
      cell: ({ row }) => {
        const placement = row.original.tournamentDeck.placement;
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
          <Link
            to={``}
            search={p => ({ ...p, maDeckId: tournamentDeck.deck?.id })}
            hash={isMobile ? 'tournament-deck-detail' : undefined}
            className="hover:underline"
          >
            {labelRenderer(key, 'leadersAndBase', 'compact')}
          </Link>
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
          <div className="text-center">
            {td.recordWin}-{td.recordLose}-{td.recordDraw}
          </div>
        );
      },
    });

    /*// Player name column
    definitions.push({
      id: 'player',
      header: 'Player',
      size: 32,
      cell: ({ row }) => {
        const username = row.original.tournamentDeck.meleePlayerUsername;
        if (!username) return 'N/A';

        return <div>{username}</div>;
      },
    });*/

    return definitions;
  }, [labelRenderer, cardListData, isMobile]);
}
