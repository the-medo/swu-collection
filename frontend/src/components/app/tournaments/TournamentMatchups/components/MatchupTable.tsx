import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatchupDisplayMode, MatchupTableData } from '../types';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import MatchupTableContent from './MatchupTableContent';
import {
  createDefaultMatchupTableFilterState,
  filterMatchupKeys,
  getEffectiveMatchupTableFilters,
  hasActiveMatchupTableFilters,
  normalizeMatchupTableFilterConfig,
  type MatchupTableFilterState,
} from '../utils/matchupTableFilters.ts';

export interface MatchupTableProps {
  matchupData: MatchupTableData;
  displayMode: MatchupDisplayMode;
  metaInfo: MetaInfo;
  labelRenderer: ReturnType<typeof useLabel>;
  totalMatchesAnalyzed: number;
  formatId?: number;
}

// Maximum number of rows/columns to display when not showing all data
const MAX_DISPLAY_ITEMS = 30;

export const MatchupTable: React.FC<MatchupTableProps> = ({
  matchupData,
  displayMode,
  metaInfo,
  labelRenderer,
  totalMatchesAnalyzed,
}) => {
  const [tableFilters, setTableFilters] = useState<MatchupTableFilterState>(() =>
    createDefaultMatchupTableFilterState(),
  );
  const [debouncedTableFilters, setDebouncedTableFilters] = useState<MatchupTableFilterState>(() =>
    createDefaultMatchupTableFilterState(),
  );
  const [showAllData, setShowAllData] = useState<boolean>(false);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const columnCellsRef = useRef<Map<number, HTMLTableCellElement[]>>(new Map()); // Store column cell references in a ref to avoid re-renders
  const hoveredColRef = useRef<number | null>(null); // Store the currently hovered column in a ref

  // Function to register or unregister a cell with its column
  const registerCellRef = useCallback(
    (
      columnIndex: number,
      cellRef: HTMLTableCellElement | null,
      oldCellRef: HTMLTableCellElement | null = null,
    ) => {
      // Ensure the column exists in the map
      if (!columnCellsRef.current.has(columnIndex)) {
        columnCellsRef.current.set(columnIndex, []);
      }

      const cells = columnCellsRef.current.get(columnIndex);
      if (!cells) return;

      if (cellRef === null && oldCellRef !== null) {
        // This is an unregister operation - remove the old cell reference
        const index = cells.indexOf(oldCellRef);
        if (index !== -1) {
          cells.splice(index, 1);
        }
      } else if (cellRef !== null) {
        // This is a register operation - add the cell if it's not already in the array
        if (!cells.includes(cellRef)) {
          cells.push(cellRef);
        }
      }
    },
    [],
  );

  // Debounce the full table filter config so row and column filtering stay in sync.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTableFilters(normalizeMatchupTableFilterConfig(tableFilters));
    }, 75); // 75ms debounce

    return () => {
      clearTimeout(timer);
    };
  }, [tableFilters]);

  // Cleanup column cell references when component unmounts
  useEffect(() => {
    const columnCells = columnCellsRef.current;

    return () => {
      // Clear all column cell references
      columnCells.clear();
      // Reset hovered column
      hoveredColRef.current = null;
    };
  }, []);

  const { setTournamentDeckKey } = useTournamentMetaActions();

  const onRowClick = useCallback(
    (key: string) => {
      setTournamentDeckKey({
        key,
        metaInfo,
      });
    },
    [metaInfo, setTournamentDeckKey],
  );

  const labelWidth = useMemo(
    () => ({
      width: `${labelWidthBasedOnMetaInfo[metaInfo]}px`,
      minWidth: `${labelWidthBasedOnMetaInfo[metaInfo]}px`,
    }),
    [metaInfo],
  );

  const labelHeight = useMemo(
    () => ({
      height: `${labelWidthBasedOnMetaInfo[metaInfo]}px`,
    }),
    [metaInfo],
  );

  const setVisibleFilterText = useCallback((text: string) => {
    setTableFilters(prev => {
      const rowFilters = { ...prev.rowFilters, text };

      return {
        ...prev,
        rowFilters,
        columnFilters: prev.isMirrored ? rowFilters : prev.columnFilters,
      };
    });
  }, []);

  const resolveKeySearchText = useCallback(
    (key: string) => {
      const label = labelRenderer(key, metaInfo, 'text');
      return typeof label === 'string' ? label : undefined;
    },
    [labelRenderer, metaInfo],
  );

  const effectiveTableFilters = useMemo(
    () => getEffectiveMatchupTableFilters(debouncedTableFilters),
    [debouncedTableFilters],
  );

  const hasActiveTableFilters = useMemo(
    () => hasActiveMatchupTableFilters(debouncedTableFilters),
    [debouncedTableFilters],
  );
  const hasPendingTableFilters = useMemo(
    () => hasActiveMatchupTableFilters(tableFilters),
    [tableFilters],
  );

  const filteredRowKeys = useMemo(
    () =>
      filterMatchupKeys(
        matchupData.rowKeys,
        effectiveTableFilters.rowFilters,
        matchupData.keyInfo,
        resolveKeySearchText,
      ),
    [
      effectiveTableFilters.rowFilters,
      matchupData.keyInfo,
      matchupData.rowKeys,
      resolveKeySearchText,
    ],
  );

  const filteredColKeys = useMemo(
    () =>
      filterMatchupKeys(
        matchupData.colKeys,
        effectiveTableFilters.columnFilters,
        matchupData.keyInfo,
        resolveKeySearchText,
      ),
    [
      effectiveTableFilters.columnFilters,
      matchupData.colKeys,
      matchupData.keyInfo,
      resolveKeySearchText,
    ],
  );

  const visibleRowKeys = useMemo(() => {
    if (!showAllData && !hasActiveTableFilters && filteredRowKeys.length > MAX_DISPLAY_ITEMS) {
      return filteredRowKeys.slice(0, MAX_DISPLAY_ITEMS);
    }

    return filteredRowKeys;
  }, [filteredRowKeys, hasActiveTableFilters, showAllData]);

  const visibleColKeys = useMemo(() => {
    if (!showAllData && !hasActiveTableFilters && filteredColKeys.length > MAX_DISPLAY_ITEMS) {
      return filteredColKeys.slice(0, MAX_DISPLAY_ITEMS);
    }

    return filteredColKeys;
  }, [filteredColKeys, hasActiveTableFilters, showAllData]);

  // Handler for column hover (works for both headers and data cells)
  const handleColumnEnter = useCallback((index: number) => {
    // Only update if the column has changed
    if (hoveredColRef.current !== index) {
      // Store the previous column for cleanup
      const prevCol = hoveredColRef.current;

      // Update the ref first
      hoveredColRef.current = index;

      // Remove highlights from previous column cells
      if (prevCol !== null && columnCellsRef.current.has(prevCol)) {
        const prevCells = columnCellsRef.current.get(prevCol);
        if (prevCells) {
          prevCells.forEach(cell => {
            cell.classList.remove('highlight-col', 'brightness-90', 'bg-accent');
          });
        }
      }

      // Add highlights to new column cells
      if (columnCellsRef.current.has(index)) {
        const newCells = columnCellsRef.current.get(index);
        if (newCells) {
          newCells.forEach(cell => {
            cell.classList.add('highlight-col', 'brightness-90', 'bg-accent');
          });
        }
      }
    }
  }, []);

  const visibleMatchupData = useMemo(
    () => ({
      ...matchupData,
      rowKeys: visibleRowKeys,
      colKeys: visibleColKeys,
    }),
    [matchupData, visibleColKeys, visibleRowKeys],
  );

  // Check if data is truncated
  const isDataTruncated =
    !hasActiveTableFilters &&
    (filteredRowKeys.length > MAX_DISPLAY_ITEMS || filteredColKeys.length > MAX_DISPLAY_ITEMS);

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-screen">
      <MatchupTableContent
        tableRef={tableRef}
        matchupData={visibleMatchupData}
        rowKeys={visibleRowKeys}
        colKeys={visibleColKeys}
        displayMode={displayMode}
        metaInfo={metaInfo}
        labelRenderer={labelRenderer}
        totalMatchesAnalyzed={totalMatchesAnalyzed}
        filterText={tableFilters.rowFilters.text}
        setFilterText={setVisibleFilterText}
        handleColumnEnter={handleColumnEnter}
        onRowClick={onRowClick}
        labelWidth={labelWidth}
        labelHeight={labelHeight}
        registerCellRef={registerCellRef}
        showAllData={showAllData}
        setShowAllData={setShowAllData}
        isDataTruncated={isDataTruncated}
        hasActiveFilters={hasActiveTableFilters || hasPendingTableFilters}
        originalRowCount={matchupData.rowKeys.length}
        originalColCount={matchupData.colKeys.length}
        maxDisplayItems={MAX_DISPLAY_ITEMS}
      />
    </div>
  );
};

export default MatchupTable;
