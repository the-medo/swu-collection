import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatchupDataMap, MatchupDisplayMode, MatchupTotalData } from '../types';
import { MatchupTableCell } from './MatchupTableCell';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import RowTotalCell from '@/components/app/tournaments/TournamentMatchups/components/MatchupRowTotalCell.tsx';
import { cn } from '@/lib/utils.ts';

const MemoizedCell = React.memo(MatchupTableCell);

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

export const MatchupTable: React.FC<MatchupTableProps> = ({
  matchupData,
  displayMode,
  metaInfo,
  labelRenderer,
  totalMatchesAnalyzed,
}) => {
  const [filterText, setFilterText] = useState<string>('');
  const [debouncedFilterText, setDebouncedFilterText] = useState<string>('');
  const tableRef = useRef<HTMLTableElement>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // Debounce filter text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterText(filterText);
    }, 75); // 75ms debounce

    return () => {
      clearTimeout(timer);
    };
  }, [filterText]);

  // Set data-highlighted attribute on the table when hovering columns
  useEffect(() => {
    if (!tableRef.current) return;

    if (hoveredCol !== null) {
      tableRef.current.setAttribute('data-highlighted-col', String(hoveredCol));
    } else {
      tableRef.current.removeAttribute('data-highlighted-col');
    }
  }, [hoveredCol]);

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

  // Filter keys based on the debounced filter text
  const filteredKeys = useMemo(() => {
    if (!debouncedFilterText) return matchupData.keys;
    return matchupData.keys.filter(key =>
      key.toLowerCase().includes(debouncedFilterText.toLowerCase()),
    );
  }, [debouncedFilterText, matchupData.keys]);

  // Handler for column headers
  const handleColumnHeaderEnter = useCallback((index: number) => {
    setHoveredCol(index);
  }, []);

  useEffect(() => {
    if (!tableRef.current) return;

    // Remove existing highlights
    tableRef.current.querySelectorAll('td.highlight-col').forEach(el => {
      el.classList.remove('highlight-col', 'brightness-90', 'bg-accent');
    });

    // Apply new highlights
    if (hoveredCol !== null) {
      tableRef.current.querySelectorAll(`td[data-column-index="${hoveredCol}"]`).forEach(el => {
        el.classList.add('highlight-col', 'brightness-90', 'bg-accent');
      });
    }
  }, [hoveredCol]);

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-[100vh]">
      <table
        ref={tableRef}
        className={cn('border-collapse matchup-table td[data-[column-index=3]:bg-primary]')}
      >
        <thead className="sticky top-0 z-20 bg-background">
          <tr>
            <td className="p-2 border text-center font-semibold align-bottom min-w-[80px]">
              <div>Total</div>
              <span className="text-[10px] font-semibold mb-4">{totalMatchesAnalyzed} mtch</span>
            </td>
            <td className="p-2 align-bottom border">
              {filterText && (
                <div
                  className="text-[10px] text-muted-foreground cursor-pointer mt-1 text-right"
                  onClick={() => setFilterText('')}
                >
                  Clear filter
                </div>
              )}
              <input
                type="text"
                placeholder="Filter..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="w-full text-sm p-1 rounded border"
              />
            </td>
            {matchupData.keys.map((key, colIndex) => (
              <td
                key={key}
                data-column-index={colIndex + 2} // +2 because of the two initial columns
                className="p-2 border w-[40px] max-w-[40px] column-header"
                onMouseEnter={() => handleColumnHeaderEnter(colIndex + 2)}
              >
                <div
                  className="text-[13px] -rotate-90 origin-bottom-left whitespace-nowrap flex items-end translate-x-1/2 ml-[20px] transform-gpu"
                  style={labelHeight}
                >
                  {labelRenderer(key, metaInfo, 'compact')}
                </div>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredKeys.map(rowKey => (
            <tr key={rowKey} className="h-[20px] text-sm hover:bg-accent hover:brightness-90">
              <RowTotalCell
                rowKey={rowKey}
                totalStats={matchupData.totalStats}
                displayMode={displayMode}
              />
              <td
                className="p-1 border cursor-pointer text-[13px]"
                onClick={() => onRowClick(rowKey)}
                style={labelWidth}
              >
                {labelRenderer(rowKey, metaInfo, 'compact')}
              </td>
              {matchupData.keys.map((colKey, colIndex) => (
                <MemoizedCell
                  key={colKey}
                  rowKey={rowKey}
                  colKey={colKey}
                  matchups={matchupData.matchups}
                  displayMode={displayMode}
                  setHoveredCol={setHoveredCol}
                  columnIndex={colIndex + 2} // +2 because of the two initial columns
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchupTable;
