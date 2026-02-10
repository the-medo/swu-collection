import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { getCardStatSorter, transformMetricsToTableData } from '../cardStatLib.ts';
import CardStatsTableRow from './CardStatsTableRow.tsx';
import { GameResult } from '../../../../../../../../server/db/schema/game_result.ts';
import { StatsTableHeaderCell, StatsTableHeaderGroup } from './CardStatsTableHeader.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CardStatTableRow } from '@/components/app/statistics/components/SubpageCardStats/cardStatLib.ts';
import { ArrowDown } from 'lucide-react';

interface CardStatsTableProps {
  games: GameResult[];
}

const CardStatsTable: React.FC<CardStatsTableProps> = ({ games }) => {
  const navigate = useNavigate();
  const { sCardMetricColumn = 'included', sCardMetricSort = 'desc' } = useSearch({ strict: false });

  const onSortChange = useCallback((column: keyof CardStatTableRow) => {
    navigate({
      to: '.',
      search: prev => ({
        ...prev,
        sCardMetricColumn: column,
        sCardMetricSort:
          column === prev.sCardMetricColumn
            ? prev.sCardMetricSort === 'asc'
              ? 'desc'
              : 'asc'
            : 'desc',
      }),
    });
  }, []);

  const metrics = useMemo(() => transformMetricsToTableData(games), [games]);
  const data = useMemo(() => {
    return [...metrics].sort(
      getCardStatSorter(
        sCardMetricColumn as keyof CardStatTableRow,
        sCardMetricSort as 'asc' | 'desc',
      ),
    );
  }, [metrics, sCardMetricColumn, sCardMetricSort]);

  const renderHeaderGroups = () => (
    <tr>
      <th
        className="sticky left-0 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-r-2 border-r-slate-400 dark:border-r-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800"
        rowSpan={2}
        onClick={() => onSortChange('cardId')}
      >
        <span className="inline-flex items-center gap-1">
          Card
          {sCardMetricColumn === 'cardId' && <ArrowDown className="w-3 h-3" />}
        </span>
      </th>
      <StatsTableHeaderGroup colSpan={3} thickRightBorder onClick={() => onSortChange('included')}>
        Included
      </StatsTableHeaderGroup>
      <StatsTableHeaderGroup colSpan={3} thickRightBorder onClick={() => onSortChange('drawn')}>
        Drawn
      </StatsTableHeaderGroup>
      <StatsTableHeaderGroup colSpan={3} thickRightBorder onClick={() => onSortChange('played')}>
        Played
      </StatsTableHeaderGroup>
      <StatsTableHeaderGroup colSpan={3} thickRightBorder onClick={() => onSortChange('activated')}>
        Activated
      </StatsTableHeaderGroup>
      <StatsTableHeaderGroup colSpan={3} thickRightBorder onClick={() => onSortChange('resourced')}>
        Resourced
      </StatsTableHeaderGroup>
      <StatsTableHeaderGroup colSpan={3} thickRightBorder onClick={() => onSortChange('discarded')}>
        Discarded
      </StatsTableHeaderGroup>
    </tr>
  );

  const renderHeaderColumns = () => (
    <tr>
      <StatsTableHeaderCell
        onClick={() => onSortChange('included')}
        isActive={sCardMetricColumn === 'included' ? sCardMetricSort : false}
      >
        Total
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('includedInWins')}
        isActive={sCardMetricColumn === 'includedInWins' ? sCardMetricSort : false}
      >
        Wins
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('includedWinrate')}
        thickRightBorder
        isActive={sCardMetricColumn === 'includedWinrate' ? sCardMetricSort : false}
      >
        WR[%]
      </StatsTableHeaderCell>

      <StatsTableHeaderCell
        onClick={() => onSortChange('drawn')}
        isActive={sCardMetricColumn === 'drawn' ? sCardMetricSort : false}
      >
        Total
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('drawnInWins')}
        isActive={sCardMetricColumn === 'drawnInWins' ? sCardMetricSort : false}
      >
        Wins
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('drawnWinrate')}
        thickRightBorder
        isActive={sCardMetricColumn === 'drawnWinrate' ? sCardMetricSort : false}
      >
        WR[%]
      </StatsTableHeaderCell>

      <StatsTableHeaderCell
        onClick={() => onSortChange('played')}
        isActive={sCardMetricColumn === 'played' ? sCardMetricSort : false}
      >
        Total
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('playedInWins')}
        isActive={sCardMetricColumn === 'playedInWins' ? sCardMetricSort : false}
      >
        Wins
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('playedWinrate')}
        thickRightBorder
        isActive={sCardMetricColumn === 'playedWinrate' ? sCardMetricSort : false}
      >
        WR[%]
      </StatsTableHeaderCell>

      <StatsTableHeaderCell
        onClick={() => onSortChange('activated')}
        isActive={sCardMetricColumn === 'activated' ? sCardMetricSort : false}
      >
        Total
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('activatedInWins')}
        isActive={sCardMetricColumn === 'activatedInWins' ? sCardMetricSort : false}
      >
        Wins
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('activatedWinrate')}
        thickRightBorder
        isActive={sCardMetricColumn === 'activatedWinrate' ? sCardMetricSort : false}
      >
        WR[%]
      </StatsTableHeaderCell>

      <StatsTableHeaderCell
        onClick={() => onSortChange('resourced')}
        isActive={sCardMetricColumn === 'resourced' ? sCardMetricSort : false}
      >
        Total
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('resourcedInWins')}
        isActive={sCardMetricColumn === 'resourcedInWins' ? sCardMetricSort : false}
      >
        Wins
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('resourcedWinrate')}
        thickRightBorder
        isActive={sCardMetricColumn === 'resourcedWinrate' ? sCardMetricSort : false}
      >
        WR[%]
      </StatsTableHeaderCell>

      <StatsTableHeaderCell
        onClick={() => onSortChange('discarded')}
        isActive={sCardMetricColumn === 'discarded' ? sCardMetricSort : false}
      >
        Total
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('discardedInWins')}
        isActive={sCardMetricColumn === 'discardedInWins' ? sCardMetricSort : false}
      >
        Wins
      </StatsTableHeaderCell>
      <StatsTableHeaderCell
        onClick={() => onSortChange('discardedWinrate')}
        thickRightBorder
        isActive={sCardMetricColumn === 'discardedWinrate' ? sCardMetricSort : false}
      >
        WR[%]
      </StatsTableHeaderCell>
    </tr>
  );

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full border-collapse border border-slate-200 dark:border-slate-800 text-sm">
        <thead>
          {renderHeaderGroups()}
          {renderHeaderColumns()}
        </thead>
        <tbody>
          {data.map(row => (
            <CardStatsTableRow key={row.cardId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CardStatsTable;
