import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { useTournamentDeckTableColumns } from './useTournamentDeckTableColumns.tsx';
import { useDeckFilterStore } from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { getAspectsFromDeckInformation } from '@/components/app/tournaments/lib/getAspectsFromDeckInformation.ts';
import { isBasicBase } from '@/lib/cards/isBasicBase.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import TournamentDeckDetail from '@/components/app/tournaments/TournamentDecks/TournamentDeckDetail.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { Row } from '@tanstack/react-table';
import { useIsMobile } from '@/hooks/use-mobile.tsx';

interface TournamentDeckTableProps {
  decks: TournamentDeckResponse[];
}

const TournamentDeckTable: React.FC<TournamentDeckTableProps> = ({ decks }) => {
  const { leaders, base, aspects } = useDeckFilterStore();
  const { data: cardListData } = useCardList();

  const basicBaseFilter = useMemo(() => {
    if (!base || !cardListData) return false;
    return isBasicBase(cardListData.cards[base]);
  }, [base, cardListData]);

  // Filter decks based on selected filters
  const filteredDecks = useMemo(() => {
    if (!decks.length || !cardListData) return [];
    return decks.filter(deck => {
      // Filter by leader
      if (
        leaders.length > 0 &&
        !leaders.some(l => l === deck.deck?.leaderCardId1 || l === deck.deck?.leaderCardId2)
      ) {
        return false;
      }

      // Filter by base
      const baseCardId = deck.deck?.baseCardId;
      if (base && baseCardId) {
        if (basicBaseFilter) {
          const baseCard = cardListData.cards[baseCardId];
          if (
            !isBasicBase(baseCard) ||
            cardListData.cards[base]?.aspects[0] !== baseCard?.aspects[0]
          ) {
            return false;
          }
        } else if (baseCardId !== base) {
          return false;
        }
      }

      // Filter by aspects
      if (aspects.length > 0) {
        const deckAspects = getAspectsFromDeckInformation(deck.deckInformation);
        if (!aspects.every(a => deckAspects.includes(a))) {
          return false;
        }
      }

      return true;
    });
  }, [decks, leaders, base, aspects, basicBaseFilter]);

  // Sort decks by placement
  const sortedDecks = useMemo(() => {
    return [...filteredDecks].sort((a, b) => {
      const placementA = a.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      const placementB = b.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      return placementA - placementB;
    });
  }, [filteredDecks]);

  const columns = useTournamentDeckTableColumns();

  const isMobile = useIsMobile();
  const navigate = useNavigate({ from: Route.fullPath });
  const onRowClick = useCallback((row: Row<TournamentDeckResponse>) => {
    navigate({
      search: prev => ({ ...prev, maDeckId: row.original.deck?.id }),
      hash: isMobile ? 'tournament-deck-detail' : undefined,
    });
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-2">
      {sortedDecks.length > 0 ? (
        <>
          <div
            className="w-full lg:w-[40%] xl:w-[30%] max-w-[400px] h-[300px] lg:h-[calc(100vh-200px)] overflow-auto border rounded-md"
            id="tournament-deck-table"
          >
            <DataTable
              onRowClick={onRowClick}
              columns={columns}
              data={sortedDecks}
              loading={false}
              view="table"
            />
          </div>
          <TournamentDeckDetail />
        </>
      ) : (
        <div className="bg-muted p-8 rounded-md text-center">
          <p className="text-muted-foreground">No decks match the selected filters.</p>
        </div>
      )}
    </div>
  );
};

export default TournamentDeckTable;
