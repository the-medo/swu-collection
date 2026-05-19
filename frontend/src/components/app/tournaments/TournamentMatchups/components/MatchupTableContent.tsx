import * as React from 'react';
import { memo, RefObject } from 'react';
import { MatchupDisplayMode, MatchupTableData } from '../types';
import { MatchupTableCell } from './MatchupTableCell';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import RowTotalCell from '@/components/app/tournaments/TournamentMatchups/components/MatchupRowTotalCell.tsx';
import { cn } from '@/lib/utils.ts';
import type { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import MatchupTableFilterControl from './MatchupTableFilterControl.tsx';
import type { MatchupTableFilterState } from '../utils/matchupTableFilters.tsx';

const MemoizedCell = React.memo(MatchupTableCell);

interface MatchupTableContentProps {
  tableRef: RefObject<HTMLTableElement | null>;
  matchupData: MatchupTableData;
  rowKeys: string[];
  colKeys: string[];
  displayMode: MatchupDisplayMode;
  metaInfo: MetaInfo;
  labelRenderer: ReturnType<typeof useLabel>;
  totalMatchesAnalyzed: number;
  tableFilters: MatchupTableFilterState;
  onTableFiltersChange: (value: MatchupTableFilterState) => void;
  formatId?: number;
  handleColumnEnter: (index: number) => void;
  onRowClick: (key: string) => void;
  labelWidth: { width: string; minWidth: string };
  labelHeight: { height: string };
  registerCellRef: (
    columnIndex: number,
    cellRef: HTMLTableCellElement | null,
    oldCellRef?: HTMLTableCellElement | null,
  ) => void;
  showAllData: boolean;
  setShowAllData: (show: boolean) => void;
  isDataTruncated: boolean;
  hasActiveFilters: boolean;
  originalRowCount: number;
  originalColCount: number;
  maxDisplayItems: number;
}

const MatchupTableContent: React.FC<MatchupTableContentProps> = ({
  tableRef,
  matchupData,
  rowKeys,
  colKeys,
  displayMode,
  metaInfo,
  labelRenderer,
  totalMatchesAnalyzed,
  tableFilters,
  onTableFiltersChange,
  formatId,
  handleColumnEnter,
  onRowClick,
  labelWidth,
  labelHeight,
  registerCellRef,
  showAllData,
  setShowAllData,
  isDataTruncated,
  hasActiveFilters,
  originalRowCount,
  originalColCount,
  maxDisplayItems,
}) => {
  const tableColSpan = Math.max(2 + colKeys.length, 2);
  const dataColSpan = Math.max(colKeys.length, 1);

  return (
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
          <td
            className={cn(
              'p-2 align-bottom border transition-colors',
              hasActiveFilters && 'bg-primary/30 ring-1 ring-primary/40',
            )}
          >
            <MatchupTableFilterControl
              value={tableFilters}
              onChange={onTableFiltersChange}
              formatId={formatId}
              active={hasActiveFilters}
            />
          </td>
          {colKeys.map((key, colIndex) => (
            <td
              key={key}
              data-column-index={colIndex + 2} // +2 because of the two initial columns
              className="p-2 border w-[40px] max-w-[40px] column-header"
              onMouseEnter={() => handleColumnEnter(colIndex + 2)}
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
        {rowKeys.length === 0 || colKeys.length === 0 ? (
          <tr className="h-[48px] text-sm">
            <td colSpan={tableColSpan} className="p-4 border text-center text-muted-foreground">
              No matchup rows or columns match the current table filters.
            </td>
          </tr>
        ) : (
          rowKeys.map(rowKey => (
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
              {colKeys.map((colKey, colIndex) => (
                <MemoizedCell
                  key={colKey}
                  rowKey={rowKey}
                  colKey={colKey}
                  matchups={matchupData.matchups}
                  displayMode={displayMode}
                  columnIndex={colIndex + 2} // +2 because of the two initial columns
                  registerCellRef={registerCellRef}
                  handleColumnEnter={handleColumnEnter}
                />
              ))}
            </tr>
          ))
        )}

        {/* Show All Data button row */}
        {isDataTruncated && !showAllData && !hasActiveFilters && (
          <tr className="h-[40px] text-sm bg-accent/30">
            <td colSpan={2} className="p-2 border text-center font-semibold">
              Showing limited data ({rowKeys.length} rows, {colKeys.length} columns)
            </td>
            <td
              colSpan={dataColSpan}
              className="p-2 border pl-12 cursor-pointer hover:bg-accent"
              onClick={() => setShowAllData(true)}
            >
              <span className="font-semibold">
                Click to show all data ({originalRowCount} rows, {originalColCount} columns)
              </span>
            </td>
          </tr>
        )}

        {/* Show Less Data button row */}
        {isDataTruncated && showAllData && !hasActiveFilters && (
          <tr className="h-[40px] text-sm bg-accent/30">
            <td colSpan={2} className="p-2 border text-center font-semibold">
              Showing all data ({rowKeys.length} rows, {colKeys.length} columns)
            </td>
            <td
              colSpan={dataColSpan}
              className="p-2 pl-12 border cursor-pointer hover:bg-accent"
              onClick={() => setShowAllData(false)}
            >
              <span className="font-semibold">
                Click to show limited data ({maxDisplayItems} rows, {maxDisplayItems} columns)
              </span>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default memo(MatchupTableContent);
