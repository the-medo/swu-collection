import * as React from 'react';
import { memo, RefObject } from 'react';
import { MatchupDataMap, MatchupDisplayMode, MatchupTotalData } from '../types';
import { MatchupTableCell } from './MatchupTableCell';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import RowTotalCell from '@/components/app/tournaments/TournamentMatchups/components/MatchupRowTotalCell.tsx';
import { cn } from '@/lib/utils.ts';
import { Input } from '@/components/ui/input.tsx';

const MemoizedCell = React.memo(MatchupTableCell);

interface MatchupTableContentProps {
  tableRef: RefObject<HTMLTableElement>;
  matchupData: {
    keys: string[];
    matchups: MatchupDataMap;
    totalStats?: Map<string, MatchupTotalData>;
  };
  filteredKeys: string[];
  displayMode: MatchupDisplayMode;
  metaInfo: MetaInfo;
  labelRenderer: any;
  totalMatchesAnalyzed: number;
  filterText: string;
  setFilterText: (text: string) => void;
  handleColumnEnter: (index: number) => void;
  onRowClick: (key: string) => void;
  labelWidth: { width: string; minWidth: string };
  labelHeight: { height: string };
  registerCellRef: (columnIndex: number, cellRef: HTMLTableCellElement | null) => void;
  showAllData: boolean;
  setShowAllData: (show: boolean) => void;
  isDataTruncated: boolean;
  originalDataLength: number;
  maxDisplayItems: number;
}

const MatchupTableContent: React.FC<MatchupTableContentProps> = ({
  tableRef,
  matchupData,
  filteredKeys,
  displayMode,
  metaInfo,
  labelRenderer,
  totalMatchesAnalyzed,
  filterText,
  setFilterText,
  handleColumnEnter,
  onRowClick,
  labelWidth,
  labelHeight,
  registerCellRef,
  showAllData,
  setShowAllData,
  isDataTruncated,
  originalDataLength,
  maxDisplayItems,
}) => {
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
          <td className="p-2 align-bottom border">
            {filterText && (
              <div
                className="text-[10px] text-muted-foreground cursor-pointer mt-1 text-right"
                onClick={() => setFilterText('')}
              >
                Clear filter
              </div>
            )}
            <Input
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
                columnIndex={colIndex + 2} // +2 because of the two initial columns
                registerCellRef={registerCellRef}
                handleColumnEnter={handleColumnEnter}
              />
            ))}
          </tr>
        ))}

        {/* Show All Data button row */}
        {isDataTruncated && !showAllData && !filterText && (
          <tr className="h-[40px] text-sm bg-accent/30">
            <td colSpan={2} className="p-2 border text-center font-semibold">
              Showing limited data ({filteredKeys.length} rows, {matchupData.keys.length} columns)
            </td>
            <td
              colSpan={matchupData.keys.length}
              className="p-2 border pl-12 cursor-pointer hover:bg-accent"
              onClick={() => setShowAllData(true)}
            >
              <span className="font-semibold">
                Click to show all data ({originalDataLength} total rows and columns)
              </span>
            </td>
          </tr>
        )}

        {/* Show Less Data button row */}
        {isDataTruncated && showAllData && !filterText && (
          <tr className="h-[40px] text-sm bg-accent/30">
            <td colSpan={2} className="p-2 border text-center font-semibold">
              Showing all data ({filteredKeys.length} rows and columns)
            </td>
            <td
              colSpan={matchupData.keys.length}
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
