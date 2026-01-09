import * as React from 'react';
import { useLabel } from './useLabel.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { ColumnDef, Row } from '@tanstack/react-table';
import { MetaInfo } from './MetaInfoSelector';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import TournamentMetaTooltip from './TournamentMetaTooltip';
import { AnalysisDataItem, getTotalDeckCountBasedOnMetaPart } from './tournamentMetaLib.ts';
import { MetaPart } from '@/components/app/tournaments/TournamentMeta/MetaPartSelector.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';

interface TournamentMetaDataTableProps {
  analysisData: AnalysisDataItem[];
  metaPart: MetaPart;
  metaInfo: MetaInfo;
  totalDecks: number;
  day2Decks: number;
  top8Decks: number;
  top64Decks: number;
  championsDecks: number;
  minDeckCount?: number;
  metaPartsData?: {
    all: AnalysisDataItem[];
    top8: AnalysisDataItem[];
    day2: AnalysisDataItem[];
    top64: AnalysisDataItem[];
    champions: AnalysisDataItem[];
  };
}

const TournamentMetaDataTable: React.FC<TournamentMetaDataTableProps> = ({
  analysisData,
  metaPart,
  metaInfo,
  totalDecks,
  day2Decks,
  top8Decks,
  top64Decks,
  championsDecks,
  metaPartsData,
  minDeckCount,
}) => {
  const labelRenderer = useLabel();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }>({
    id: 'count',
    desc: true,
  });

  const totalDeckCountBasedOnMetaPart = getTotalDeckCountBasedOnMetaPart(
    metaPart,
    totalDecks,
    day2Decks,
    top8Decks,
    top64Decks,
    championsDecks,
  );

  const getSortedData = (data: AnalysisDataItem[]) => {
    if (!data) return [];

    // Filter data based on minDeckCount if provided
    const filteredData = minDeckCount ? data.filter(item => item.count >= minDeckCount) : data;

    return [...filteredData].sort((a, b) => {
      const multiplier = sorting.desc ? -1 : 1;

      // Basic columns
      if (sorting.id === 'key') {
        return a.key.localeCompare(b.key) * multiplier;
      }
      if (sorting.id === 'count') {
        return (a.count - b.count) * multiplier;
      }
      if (sorting.id === 'percentage') {
        return (a.count - b.count) * multiplier;
        // return (a.percentage - b.percentage) * multiplier;
      }

      if (sorting.id === 'winrate') {
        const aWinrate = a.winrate || 0;
        const bWinrate = b.winrate || 0;
        return (aWinrate - bWinrate) * multiplier;
      }

      // Meta part columns
      if (metaPartsData) {
        // Champions
        if (sorting.id === 'championsCount' || sorting.id === 'championsPercentage') {
          const aCount = metaPartsData.champions.find(d => d.key === a.key)?.count || 0;
          const bCount = metaPartsData.champions.find(d => d.key === b.key)?.count || 0;
          return (aCount - bCount) * multiplier;
        }

        // Top 8
        if (sorting.id === 'top8Count' || sorting.id === 'top8Percentage') {
          const aCount = metaPartsData.top8.find(d => d.key === a.key)?.count || 0;
          const bCount = metaPartsData.top8.find(d => d.key === b.key)?.count || 0;
          return (aCount - bCount) * multiplier;
        }

        // Day 2
        if (sorting.id === 'day2Count' || sorting.id === 'day2Percentage') {
          const aCount = metaPartsData.day2.find(d => d.key === a.key)?.count || 0;
          const bCount = metaPartsData.day2.find(d => d.key === b.key)?.count || 0;
          return (aCount - bCount) * multiplier;
        }

        // Top 64
        if (sorting.id === 'top64Count' || sorting.id === 'top64Percentage') {
          const aCount = metaPartsData.top64.find(d => d.key === a.key)?.count || 0;
          const bCount = metaPartsData.top64.find(d => d.key === b.key)?.count || 0;
          return (aCount - bCount) * multiplier;
        }
      }

      return 0;
    });
  };

  const sortedData = getSortedData(analysisData);

  const handleSort = (columnId: string) => {
    setSorting(prev => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : true,
    }));
  };

  const renderSortIcon = (columnId: string) => {
    if (sorting.id !== columnId) return null;
    return sorting.desc ? (
      <ArrowDown className="ml-1 h-4 w-4" />
    ) : (
      <ArrowUp className="ml-1 h-4 w-4" />
    );
  };

  const columns: ColumnDef<AnalysisDataItem>[] = [
    {
      id: 'key',
      accessorKey: 'key',
      header: () => (
        <Button
          variant="ghost"
          className="p-0 font-bold flex items-center w-full"
          onClick={() => handleSort('key')}
        >
          {renderSortIcon('key')}
        </Button>
      ),
      cell: ({ row }) => {
        const metaPartData = row.original.data;

        return (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              {labelRenderer(row.original.key, metaInfo, 'compact')}
            </TooltipTrigger>
            <TooltipContent side="right">
              <TournamentMetaTooltip
                name={row.original.key}
                metaInfo={metaInfo}
                labelRenderer={labelRenderer}
                value={row.original.count}
                totalDeckCountBasedOnMetaPart={totalDeckCountBasedOnMetaPart}
                data={metaPartData}
                totalDecks={totalDecks}
                day2Decks={day2Decks}
                top8Decks={top8Decks}
                top64Decks={top64Decks}
                championsDecks={championsDecks}
              />
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: 'count',
      accessorKey: 'count',
      header: () => (
        <Button
          variant="ghost"
          className="p-0 font-bold flex items-center"
          onClick={() => handleSort('count')}
        >
          Count
          {renderSortIcon('count')}
        </Button>
      ),
      cell: ({ row }) => row.original.count,
    },
    {
      id: 'percentage',
      accessorKey: 'percentage',
      header: () => (
        <Button
          variant="ghost"
          className="p-0 font-bold flex items-center"
          onClick={() => handleSort('percentage')}
        >
          Percentage
          {renderSortIcon('percentage')}
        </Button>
      ),
      cell: ({ row }) => `${row.original.percentage?.toFixed(1)}%`,
    },
    {
      id: 'winrate',
      accessorKey: 'winrate',
      header: () => (
        <Button
          variant="ghost"
          className="p-0 font-bold flex items-center"
          onClick={() => handleSort('winrate')}
        >
          Winrate
          {renderSortIcon('winrate')}
        </Button>
      ),
      cell: ({ row }) => (row.original.winrate ? `${row.original.winrate}%` : 'N/A'),
    },
  ];

  // Add columns for meta parts if available
  if (metaPartsData) {
    if (metaPartsData.top64.length > 0) {
      columns.push(
        {
          id: 'top64Count',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('top64Count')}
            >
              Top 64 Count
              {renderSortIcon('top64Count')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.top64.find(d => d.key === row.original.key);
            return item ? item.count : 0;
          },
        },
        {
          id: 'top64Percentage',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('top64Percentage')}
            >
              Top 64 %{renderSortIcon('top64Percentage')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.top64.find(d => d.key === row.original.key);
            return item ? `${item.percentage?.toFixed(1)}%` : '0.0%';
          },
        },
      );
    }

    if (metaPartsData.day2.length > 0) {
      columns.push(
        {
          id: 'day2Count',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('day2Count')}
            >
              Day 2 Count
              {renderSortIcon('day2Count')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.day2.find(d => d.key === row.original.key);
            return item ? item.count : 0;
          },
        },
        {
          id: 'day2Percentage',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('day2Percentage')}
            >
              Day 2 %{renderSortIcon('day2Percentage')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.day2.find(d => d.key === row.original.key);
            return item ? `${item.percentage?.toFixed(1)}%` : '0.0%';
          },
        },
      );
    }

    if (metaPartsData.top8.length > 0) {
      columns.push(
        {
          id: 'top8Count',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('top8Count')}
            >
              Top 8 Count
              {renderSortIcon('top8Count')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.top8.find(d => d.key === row.original.key);
            return item ? item.count : 0;
          },
        },
        {
          id: 'top8Percentage',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('top8Percentage')}
            >
              Top 8 %{renderSortIcon('top8Percentage')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.top8.find(d => d.key === row.original.key);
            return item ? `${item.percentage?.toFixed(1)}%` : '0.0%';
          },
        },
      );
    }

    if (metaPartsData.champions.length > 0) {
      columns.push(
        {
          id: 'championsCount',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('championsCount')}
            >
              Champions Count
              {renderSortIcon('championsCount')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.champions.find(d => d.key === row.original.key);
            return item ? item.count : 0;
          },
        },
        {
          id: 'championsPercentage',
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort('championsPercentage')}
            >
              Champions %{renderSortIcon('championsPercentage')}
            </Button>
          ),
          cell: ({ row }) => {
            const item = metaPartsData.champions.find(d => d.key === row.original.key);
            return item ? `${item.percentage?.toFixed(1)}%` : '0.0%';
          },
        },
      );
    }
  }

  const onRowClick = useCallback(
    (row: Row<AnalysisDataItem>) => {
      setTournamentDeckKey({
        key: row.original.key,
        metaInfo,
      });
    },
    [metaInfo],
  );

  if (analysisData.length === 0) {
    return <p className="text-muted-foreground">No data available for the selected filters.</p>;
  }

  return (
    <div className="mt-4">
      <DataTable onRowClick={onRowClick} columns={columns} data={sortedData} />
    </div>
  );
};

export default TournamentMetaDataTable;
