import * as React from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useState, useMemo } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { Switch } from '@/components/ui/switch.tsx';
import { useSideStatWeeklyShiftTableColumns } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/useSideStatWeeklyShiftTableColumns.tsx';
import { emptyMetaPartObject } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/weekToWeekLib.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';

interface SideStatWeeklyShiftTableProps {
  deckKey: string | null;
  data: WeekToWeekData;
  metaInfo: MetaInfo;
}

const SideStatWeeklyShiftTable: React.FC<SideStatWeeklyShiftTableProps> = ({
  deckKey,
  data,
  metaInfo,
}) => {
  const labelRenderer = useLabel();
  const [showCounts, setShowCounts] = useState(false);

  // Pass sorting state but don't allow changing it
  const columns = useSideStatWeeklyShiftTableColumns(showCounts);

  const tableData = useMemo(() => {
    if (!deckKey) return [];

    const deckData = data.deckKeyToWeek[deckKey] || {};
    const result = [];

    // Process data for each week
    for (let i = 0; i < data.sortedWeeks.length; i++) {
      const weekId = data.sortedWeeks[i];
      const weekNumber = data.weekMap[weekId]?.weekNumber || 0;

      if (!weekNumber) continue; // Skip if week number is invalid

      // Get week data or create empty data if missing
      const weekData = deckData[weekId] || { ...emptyMetaPartObject };

      // Get previous week data if available
      const prevWeekId = i > 0 ? data.sortedWeeks[i - 1] : null;
      const prevWeekData = prevWeekId ? deckData[prevWeekId] || { ...emptyMetaPartObject } : null;

      // Calculate totals for percentage calculations
      const totalChampions = Object.values(data.weekToDeckKey[weekId] || {}).reduce(
        (sum, item) => sum + item.winner,
        0,
      );
      const totalTop8 = Object.values(data.weekToDeckKey[weekId] || {}).reduce(
        (sum, item) => sum + item.top8,
        0,
      );
      const totalDecks = Object.values(data.weekToDeckKey[weekId] || {}).reduce(
        (sum, item) => sum + item.total,
        0,
      );

      // Calculate percentages
      const championPercentage = totalChampions > 0 ? (weekData.winner / totalChampions) * 100 : 0;
      const top8Percentage = totalTop8 > 0 ? (weekData.top8 / totalTop8) * 100 : 0;
      const totalPercentage = totalDecks > 0 ? (weekData.total / totalDecks) * 100 : 0;

      // Calculate changes from previous week
      const championChange = prevWeekData ? weekData.winner - prevWeekData.winner : 0;
      const top8Change = prevWeekData ? weekData.top8 - prevWeekData.top8 : 0;
      const totalChange = prevWeekData ? weekData.total - prevWeekData.total : 0;

      // Calculate percentage changes
      let championPercentageChange = 0;
      let top8PercentageChange = 0;
      let totalPercentageChange = 0;

      if (prevWeekData && prevWeekId) {
        const prevTotalChampions = Object.values(data.weekToDeckKey[prevWeekId] || {}).reduce(
          (sum, item) => sum + item.winner,
          0,
        );
        const prevTotalTop8 = Object.values(data.weekToDeckKey[prevWeekId] || {}).reduce(
          (sum, item) => sum + item.top8,
          0,
        );
        const prevTotalDecks = Object.values(data.weekToDeckKey[prevWeekId] || {}).reduce(
          (sum, item) => sum + item.total,
          0,
        );

        const prevChampionPercentage =
          prevTotalChampions > 0 ? (prevWeekData.winner / prevTotalChampions) * 100 : 0;
        const prevTop8Percentage =
          prevTotalTop8 > 0 ? (prevWeekData.top8 / prevTotalTop8) * 100 : 0;
        const prevTotalPercentage =
          prevTotalDecks > 0 ? (prevWeekData.total / prevTotalDecks) * 100 : 0;

        championPercentageChange = championPercentage - prevChampionPercentage;
        top8PercentageChange = top8Percentage - prevTop8Percentage;
        totalPercentageChange = totalPercentage - prevTotalPercentage;
      }

      result.push({
        weekId,
        weekNumber,
        championCount: weekData.winner,
        championPercentage,
        championChange,
        championPercentageChange,
        top8Count: weekData.top8,
        top8Percentage,
        top8Change,
        top8PercentageChange,
        totalCount: weekData.total,
        totalPercentage,
        totalChange,
        totalPercentageChange,
      });
    }

    // Always sort by week number
    return result.sort((a, b) => a.weekNumber - b.weekNumber);
  }, [deckKey, data.deckKeyToWeek, data.sortedWeeks, data.weekMap, data.weekToDeckKey]);

  if (!deckKey) {
    return <p className="text-muted-foreground text-center">No deck selected</p>;
  }

  if (tableData.length === 0) {
    return (
      <p className="text-muted-foreground text-center">No data available for the selected deck</p>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="px-2 flex justify-between items-center gap-2">
        <span className="text-muted-foreground text-xl font-semibold">
          {labelRenderer(deckKey, metaInfo, 'image-small')}
        </span>
        <div className="flex justify-end items-center gap-2">
          <span className="text-sm text-muted-foreground">Show Counts</span>
          <Switch checked={showCounts} onCheckedChange={setShowCounts} />
        </div>
      </div>
      <DataTable columns={columns} data={tableData} />
    </div>
  );
};

export default SideStatWeeklyShiftTable;
