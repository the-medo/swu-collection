import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { useTournamentDeckTableColumns } from './useTournamentDeckTableColumns.tsx';
import { useDeckFilterStore } from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { getAspectsFromDeckInformation } from '@/components/app/tournaments/lib/getAspectsFromDeckInformation.ts';
import { isBasicBase } from '../../../../../../shared/lib/isBasicBase.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import TournamentDeckDetail from '@/components/app/tournaments/TournamentDecks/TournamentDeckDetail.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { Row, RowSelectionState } from '@tanstack/react-table';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { getDeckKeys } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { Button } from '@/components/ui/button.tsx';
import { Scale } from 'lucide-react';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore.ts';
import { DeckCardsInfo } from '@/components/app/card-stats/CardDecks/CardDecks.tsx';
import { cn } from '@/lib/utils.ts';

interface TournamentDeckTableProps {
  decks: (TournamentDeckResponse & DeckCardsInfo)[];
  tableHead?: React.ReactNode;
  highlightedCardId?: string;
  useKeyAndKeyMetaInfo?: boolean;
  deckIdSearchParam: 'maDeckId' | 'csDeckId';
}

const TournamentDeckTable: React.FC<TournamentDeckTableProps> = ({
  decks,
  tableHead,
  highlightedCardId,
  useKeyAndKeyMetaInfo = true,
  deckIdSearchParam,
}) => {
  const { leaders, base, aspects } = useDeckFilterStore(false);
  const { data: cardListData } = useCardList();
  const isMobile = useIsMobile();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const search = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });
  const selectedDeckId = search[deckIdSearchParam];
  const key = search.maDeckKey;
  const keyMetaInfo = search.maDeckKeyType;
  const [defaultDeckInit, setDefaultDeckInit] = useState<boolean>(!!selectedDeckId);

  const basicBaseFilter = useMemo(() => {
    if (!base || !cardListData) return false;
    return isBasicBase(cardListData.cards[base]);
  }, [base, cardListData]);

  // Filter decks based on selected filters
  const filteredDecks = useMemo(() => {
    if (!decks.length || !cardListData) return [];

    if (useKeyAndKeyMetaInfo && key && keyMetaInfo) {
      return decks.filter(deck =>
        getDeckKeys(deck, keyMetaInfo as MetaInfo, cardListData)?.includes(key),
      );
    }

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
  }, [decks, leaders, base, aspects, basicBaseFilter, key, keyMetaInfo, useKeyAndKeyMetaInfo]);

  // Sort decks by placement
  const sortedDecks = useMemo(() => {
    return [...filteredDecks].sort((a, b) => {
      const placementA = a.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      const placementB = b.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      return placementA - placementB;
    });
  }, [filteredDecks]);

  // Count selected decks
  const selectedDecksCount = Object.keys(rowSelection).length;
  const showMdAndSbColumns = sortedDecks.length > 0 && 'deckCards' in sortedDecks[0];
  const columns = useTournamentDeckTableColumns(true, showMdAndSbColumns);

  const onRowClick = useCallback((row: Row<TournamentDeckResponse>) => {
    navigate({
      search: prev => ({ ...prev, [deckIdSearchParam]: row.original.deck?.id }),
      hash: isMobile ? 'tournament-deck-detail' : undefined,
    });
  }, []);

  useEffect(() => {
    if (
      ((useKeyAndKeyMetaInfo && key && keyMetaInfo) || !useKeyAndKeyMetaInfo) &&
      !defaultDeckInit
    ) {
      if (!selectedDeckId && sortedDecks.length > 0) {
        setDefaultDeckInit(true);
        navigate({
          search: p => ({ ...p, [deckIdSearchParam]: sortedDecks[0].deck?.id }),
        });
      }
    }
  }, [deckIdSearchParam, key, keyMetaInfo, useKeyAndKeyMetaInfo, defaultDeckInit]);

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: sortedDecks.length,
    initialItemsToLoad: 50,
    itemsPerBatch: 50,
    threshold: 300,
  });

  const visibleDecks = useMemo(() => {
    return sortedDecks.slice(0, itemsToShow);
  }, [sortedDecks, itemsToShow]);

  const isRowHighlighted = (row: Row<TournamentDeckResponse>) =>
    row.original.deck?.id === selectedDeckId;

  const { addComparerEntry, clearComparerEntries } = useComparerStoreActions();

  // Handler for clearing selection
  const handleClearSelection = () => {
    setRowSelection({});
  };

  const addSelectedDecksToComparer = () => {
    const selectedDeckRows = Object.keys(rowSelection);

    selectedDeckRows.forEach(rowId => {
      try {
        const index = parseInt(rowId);
        if (isNaN(index) || index < 0 || index >= visibleDecks.length) {
          console.error(`Invalid row ID: ${rowId}`);
          return;
        }

        const deck = visibleDecks[index];
        if (!deck || !deck.deck?.id) {
          console.error(`Deck not found or missing ID for row ID: ${rowId}`);
          return;
        }

        addComparerEntry({
          id: deck.deck.id,
          dataType: 'deck',
          additionalData: {
            title: deck.deck.name,
            leader1: deck.deck.leaderCardId1 ?? undefined,
            leader2: deck.deck.leaderCardId2 ?? undefined,
            base: deck.deck.baseCardId ?? undefined,
          },
        });
      } catch (error) {
        console.error(`Error adding deck to comparer: ${error}`);
      }
    });
  };

  // Handler for adding selected decks to comparer
  const handleAddToComparer = () => {
    addSelectedDecksToComparer();
    handleClearSelection();
  };

  // Handler for replacing comparer with selected decks
  const handleReplaceAndCompare = () => {
    clearComparerEntries();
    addSelectedDecksToComparer();
    handleClearSelection();
    navigate({ to: '/comparer' });
  };

  const floatingComponent = useMemo(() => {
    if (selectedDecksCount === 0) return null;
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-background border border-border xrounded-lg xshadow-lg p-2 flex items-center gap-2 z-10">
        <div className="flex gap-4">
          <Scale className="size-8" />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              Comparer - {selectedDecksCount} {selectedDecksCount === 1 ? 'deck' : 'decks'} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" onClick={handleClearSelection}>
                Clear
              </Button>
              <Button variant="outline" size="xs" onClick={handleAddToComparer}>
                Add
              </Button>
              <Button variant="default" size="xs" onClick={handleReplaceAndCompare}>
                Compare
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    selectedDecksCount,
    visibleDecks,
    navigate,
    handleClearSelection,
    handleAddToComparer,
    handleReplaceAndCompare,
  ]);

  return (
    <div className="flex flex-col lg:flex-row gap-2 relative">
      {visibleDecks.length > 0 ? (
        <>
          <div
            className={cn(
              'w-full lg:w-[40%] xl:w-[30%] max-w-[400px] h-[300px] lg:h-[calc(100vh-200px)] relative',
              {
                'max-w-[500px]': showMdAndSbColumns,
              },
            )}
          >
            <div
              className="overflow-auto border h-full rounded-md relative"
              id="tournament-deck-table"
            >
              {tableHead}
              <DataTable
                columns={columns}
                data={visibleDecks}
                loading={false}
                view="table"
                onRowClick={onRowClick}
                isRowHighlighted={isRowHighlighted}
                infiniteScrollObserver={observerTarget}
                enableRowSelection={true}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </div>
            {floatingComponent}
          </div>
          <TournamentDeckDetail
            highlightedCardId={highlightedCardId}
            deckIdSearchParam={deckIdSearchParam}
          />
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
