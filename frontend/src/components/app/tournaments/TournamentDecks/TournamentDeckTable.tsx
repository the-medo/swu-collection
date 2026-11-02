import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { useTournamentDeckTableColumns } from './useTournamentDeckTableColumns.tsx';
import { getAspectsFromDeckInformation } from '@/components/app/tournaments/lib/getAspectsFromDeckInformation.ts';
import { isBasicBase } from '../../../../../../shared/lib/isBasicBase.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import TournamentDeckDetail from '@/components/app/tournaments/TournamentDecks/TournamentDeckDetail.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Row, RowSelectionState } from '@tanstack/react-table';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { getDeckKeys } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Scale } from 'lucide-react';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore.ts';
import { DeckCardsInfo } from '@/components/app/card-stats/CardDecks/CardDecks.tsx';
import { cn } from '@/lib/utils.ts';

const getTournamentDeckRowId = (deck: TournamentDeckResponse) =>
  `${deck.tournamentDeck.tournamentId}:${deck.tournamentDeck.deckId}`;

interface TournamentDeckTableProps {
  decks: (TournamentDeckResponse & DeckCardsInfo)[];
  tableHead?: React.ReactNode;
  highlightedCardId?: string;
  useKeyAndKeyMetaInfo?: boolean;
  deckIdSearchParam: 'maDeckId' | 'csDeckId';
  compact?: boolean;
  autoSelectFirstDeck?: boolean;
  topLeaderDeckIds?: ReadonlySet<string>;
}

const TournamentDeckTable: React.FC<TournamentDeckTableProps> = ({
  decks,
  tableHead,
  highlightedCardId,
  useKeyAndKeyMetaInfo = true,
  deckIdSearchParam,
  compact,
  autoSelectFirstDeck = false,
  topLeaderDeckIds,
}) => {
  const { data: cardListData } = useCardList();
  const isMobile = useIsMobile();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const search = useSearch({ strict: false });
  const { deckLeaders: leaders, deckBase: base, deckAspects: aspects } = search;
  const navigate = useNavigate();
  const selectedDeckId = search[deckIdSearchParam];
  const key = search.maDeckKey;
  const keyMetaInfo = search.maDeckKeyType;
  const defaultDeckInitialized = useRef(!!selectedDeckId);
  const tableContainer = useRef<HTMLDivElement>(null);

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
        leaders &&
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
      if (aspects && aspects.length > 0) {
        const deckAspects = getAspectsFromDeckInformation(deck.deckInformation);
        if (!aspects.every(a => deckAspects.includes(a))) {
          return false;
        }
      }

      return true;
    });
  }, [
    decks,
    cardListData,
    leaders,
    base,
    aspects,
    basicBaseFilter,
    key,
    keyMetaInfo,
    useKeyAndKeyMetaInfo,
  ]);

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
  const selectedDeck = sortedDecks.find(deck => deck.deck?.id === selectedDeckId);
  const columns = useTournamentDeckTableColumns(true, showMdAndSbColumns, topLeaderDeckIds);

  const onRowClick = useCallback(
    (row: Row<TournamentDeckResponse>) => {
      navigate({
        to: '.',
        search: prev => ({ ...prev, [deckIdSearchParam]: row.original.deck?.id }),
        hash: isMobile ? 'tournament-deck-detail' : undefined,
      });
    },
    [navigate, deckIdSearchParam, isMobile],
  );

  useEffect(() => {
    if (defaultDeckInitialized.current) return;
    if (selectedDeckId) {
      defaultDeckInitialized.current = true;
      return;
    }

    if (
      !(
        autoSelectFirstDeck ||
        (useKeyAndKeyMetaInfo && key && keyMetaInfo) ||
        !useKeyAndKeyMetaInfo
      )
    )
      return;

    const firstDeckId = sortedDecks.find(deck => deck.deck?.id)?.deck?.id;
    if (!firstDeckId) return;

    defaultDeckInitialized.current = true;
    void navigate({
      to: '.',
      search: previous => ({ ...previous, [deckIdSearchParam]: firstDeckId }),
      replace: true,
    });
  }, [
    autoSelectFirstDeck,
    deckIdSearchParam,
    key,
    keyMetaInfo,
    useKeyAndKeyMetaInfo,
    selectedDeckId,
    sortedDecks,
    navigate,
  ]);

  const selectNextDeck = useCallback(
    (direction: 'next' | 'previous') => {
      const newDeckId =
        sortedDecks[
          sortedDecks.findIndex(deck => deck.deck?.id === selectedDeckId) +
            (direction === 'next' ? 1 : -1)
        ]?.deck?.id ?? selectedDeckId;
      navigate({
        to: '.',
        search: prev => ({ ...prev, [deckIdSearchParam]: newDeckId }),
        hash: isMobile ? 'tournament-deck-detail' : undefined,
      });
    },
    [selectedDeckId, sortedDecks, navigate, deckIdSearchParam, isMobile],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectNextDeck('next');
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectNextDeck('previous');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNextDeck]);

  const isRowHighlighted = (row: Row<TournamentDeckResponse>) =>
    row.original.deck?.id === selectedDeckId;

  const { addComparerEntry, clearComparerEntries } = useComparerStoreActions();

  // Handler for clearing selection
  const handleClearSelection = () => {
    setRowSelection({});
  };

  const addSelectedDecksToComparer = () => {
    decks
      .filter(deck => rowSelection[getTournamentDeckRowId(deck)])
      .forEach(deck => {
        try {
          if (!deck.deck?.id) {
            console.error(`Deck not found or missing ID: ${getTournamentDeckRowId(deck)}`);
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

  const floatingComponent =
    selectedDecksCount === 0 ? null : (
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

  return (
    <div className="flex flex-col lg:flex-row gap-2 relative">
      {sortedDecks.length > 0 ? (
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
              ref={tableContainer}
              className="overflow-auto border h-full rounded-md relative"
              id="tournament-deck-table"
            >
              {tableHead}
              <DataTable
                columns={columns}
                data={sortedDecks}
                loading={false}
                view="table"
                onRowClick={onRowClick}
                isRowHighlighted={isRowHighlighted}
                getRowId={getTournamentDeckRowId}
                virtualScroll={{
                  containerRef: tableContainer,
                  highlightedRowId: selectedDeck ? getTournamentDeckRowId(selectedDeck) : undefined,
                }}
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
            compact={compact}
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
