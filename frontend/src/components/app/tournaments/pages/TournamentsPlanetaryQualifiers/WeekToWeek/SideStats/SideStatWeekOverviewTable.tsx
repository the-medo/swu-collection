import * as React from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useState, useMemo, useCallback } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { Switch } from '@/components/ui/switch.tsx';
import {
  SideStatWeekOverviewTableSorting,
  useSideStatWeekOverviewTableColumns,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/useSideStatWeekOverviewTableColumns.tsx';
import { useWeekToWeekStoreActions } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import { Row } from '@tanstack/react-table';

interface WeekOverview {
  key: string;
  championCount: number;
  championPercentage: number;
  top8Count: number;
  top8Percentage: number;
  totalCount: number;
  totalPercentage: number;
}

interface SideStatWeekOverviewTableProps {
  weekId: string | null;
  data: WeekToWeekData;
  metaInfo: MetaInfo;
}

const SideStatWeekOverviewTable: React.FC<SideStatWeekOverviewTableProps> = ({
  weekId,
  data,
  metaInfo,
}) => {
  const [showCounts, setShowCounts] = useState(false);
  const [sorting, setSorting] = useState<SideStatWeekOverviewTableSorting>({
    id: 'totalPercentage',
    desc: true,
  });

  const { setHoveredRowKey } = useWeekToWeekStoreActions();

  const handleRowMouseEnter = useCallback(
    (row: Row<WeekOverview>) => setHoveredRowKey(row.original.key),
    [setHoveredRowKey],
  );

  const handleRowMouseLeave = useCallback(() => {
    // Don't clear the hoveredRowKey here to avoid flickering when moving between rows
  }, []);

  const handleTableMouseLeave = useCallback(() => {
    setHoveredRowKey(null);
  }, [setHoveredRowKey]);

  const columns = useSideStatWeekOverviewTableColumns(showCounts, sorting, setSorting, metaInfo);

  const tableData: WeekOverview[] = useMemo(() => {
    if (!weekId || !data.weekToDeckKey[weekId]) return [];

    const weekData = data.weekToDeckKey[weekId];
    const totalChampions = Object.values(weekData).reduce((sum, item) => sum + item.winner, 0);
    const totalTop8 = Object.values(weekData).reduce((sum, item) => sum + item.top8, 0);
    const totalDecks = Object.values(weekData).reduce((sum, item) => sum + item.total, 0);

    return Object.entries(weekData).map(([key, value]) => ({
      key,
      championCount: value.winner,
      championPercentage: totalChampions > 0 ? (value.winner / totalChampions) * 100 : 0,
      top8Count: value.top8,
      top8Percentage: totalTop8 > 0 ? (value.top8 / totalTop8) * 100 : 0,
      totalCount: value.total,
      totalPercentage: totalDecks > 0 ? (value.total / totalDecks) * 100 : 0,
    }));
    // .slice(0, 15);
  }, [weekId, data.weekToDeckKey]);

  const sortedData = useMemo(() => {
    if (!tableData.length) return [];

    return [...tableData].sort((a, b) => {
      const multiplier = sorting.desc ? -1 : 1;

      switch (sorting.id) {
        case 'championCount':
          return (a.championCount - b.championCount) * multiplier;
        case 'championPercentage':
          return (a.championPercentage - b.championPercentage) * multiplier;
        case 'top8Count':
          return (a.top8Count - b.top8Count) * multiplier;
        case 'top8Percentage':
          return (a.top8Percentage - b.top8Percentage) * multiplier;
        case 'totalCount':
          return (a.totalCount - b.totalCount) * multiplier;
        case 'totalPercentage':
          return (a.totalPercentage - b.totalPercentage) * multiplier;
        default:
          return 0;
      }
    });
  }, [tableData, sorting]);

  if (!weekId) {
    return (
      <p className="text-muted-foreground text-center">
        Hover or click on a chart to display data.
      </p>
    );
  }

  const weekObject = data.weekMap[weekId];

  if (sortedData.length === 0) {
    return <p className="text-muted-foreground text-center">No data available for this week</p>;
  }

  return (
    <div className="space-y-2 w-full">
      <div className="px-2 flex justify-between items-center gap-2">
        <span className="text-muted-foreground text-xl font-semibold">
          Week {weekObject?.weekNumber}
        </span>
        <div className="flex justify-end items-center gap-2">
          <span className="text-sm text-muted-foreground">Show Counts</span>
          <Switch checked={showCounts} onCheckedChange={setShowCounts} />
        </div>
      </div>
      <div className=" max-h-[65vh] overflow-y-auto">
        <DataTable<WeekOverview, unknown>
          columns={columns}
          data={sortedData}
          onRowMouseEnter={handleRowMouseEnter}
          onRowMouseLeave={handleRowMouseLeave}
          onTableMouseLeave={handleTableMouseLeave}
        />
      </div>
    </div>
  );
};

export default SideStatWeekOverviewTable;
