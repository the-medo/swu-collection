import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatchupDataMap, MatchupDisplayMode, MatchupTotalData } from '../types';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import MatchupTableContent from './MatchupTableContent';

export interface MatchupTableProps {
  matchupData: {
    keys: string[];
    matchups: MatchupDataMap;
    totalStats?: Map<string, MatchupTotalData>;
  };
  displayMode: MatchupDisplayMode;
  metaInfo: MetaInfo;
  labelRenderer: ReturnType<typeof useLabel>;
  totalMatchesAnalyzed: number;
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
  const [filterText, setFilterText] = useState<string>('');
  const [debouncedFilterText, setDebouncedFilterText] = useState<string>('');
  const [showAllData, setShowAllData] = useState<boolean>(false);
  const tableRef = useRef<HTMLTableElement>(null);

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

  // Debounce filter text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterText(filterText);
    }, 75); // 75ms debounce

    return () => {
      clearTimeout(timer);
    };
  }, [filterText]);

  // Cleanup column cell references when component unmounts
  useEffect(() => {
    return () => {
      // Clear all column cell references
      columnCellsRef.current.clear();
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

  // Filter keys based on the debounced filter text and limit to 30 if not showing all data
  const filteredKeys = useMemo(() => {
    let keys = matchupData.keys;
    
    // Apply text filter if any
    if (debouncedFilterText) {
      keys = keys.filter(key =>
        key.toLowerCase().includes(debouncedFilterText.toLowerCase()),
      );
    }
    
    // Limit rows if not showing all data
    if (!showAllData && keys.length > MAX_DISPLAY_ITEMS) {
      keys = keys.slice(0, MAX_DISPLAY_ITEMS);
    }
    
    return keys;
  }, [debouncedFilterText, matchupData.keys, showAllData]);

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

  // Limit columns if not showing all data
  const limitedMatchupData = useMemo(() => {
    if (!showAllData && matchupData.keys.length > MAX_DISPLAY_ITEMS) {
      const limitedKeys = matchupData.keys.slice(0, MAX_DISPLAY_ITEMS);
      return {
        keys: limitedKeys,
        matchups: matchupData.matchups,
        totalStats: matchupData.totalStats
      };
    }
    return matchupData;
  }, [matchupData, showAllData]);

  // Check if data is truncated
  const isDataTruncated = matchupData.keys.length > MAX_DISPLAY_ITEMS || filteredKeys.length < matchupData.keys.length;

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-[100vh]">
      <MatchupTableContent
        tableRef={tableRef}
        matchupData={limitedMatchupData}
        filteredKeys={filteredKeys}
        displayMode={displayMode}
        metaInfo={metaInfo}
        labelRenderer={labelRenderer}
        totalMatchesAnalyzed={totalMatchesAnalyzed}
        filterText={filterText}
        setFilterText={setFilterText}
        handleColumnEnter={handleColumnEnter}
        onRowClick={onRowClick}
        labelWidth={labelWidth}
        labelHeight={labelHeight}
        registerCellRef={registerCellRef}
        showAllData={showAllData}
        setShowAllData={setShowAllData}
        isDataTruncated={isDataTruncated}
        originalDataLength={matchupData.keys.length}
        maxDisplayItems={MAX_DISPLAY_ITEMS}
      />
    </div>
  );
};

export default MatchupTable;
