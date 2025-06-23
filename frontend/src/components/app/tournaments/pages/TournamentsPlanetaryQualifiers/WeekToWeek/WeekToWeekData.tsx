import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { ResponsiveAreaBump, ResponsiveBump } from '@nivo/bump';
import { useMemo } from 'react';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { usePieChartColors } from '@/components/app/tournaments/TournamentMeta/usePieChartColors.tsx';
import { useTheme } from '@/components/theme-provider.tsx';

interface WeekToWeekDataProps {
  metaInfo: MetaInfo;
  top: PQTop;
  statistics: TournamentStatistics;
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: ProcessedTournamentGroup[];
  handleWeekSelect: (tournamentGroupId: string) => void;
}

// Define the data structure for the AreaBump chart
interface AreaBumpData {
  id: string;
  data: {
    x: number;
    y: number;
    groupId?: string; // Store the group ID for click handling
  }[];
}

const WeekToWeekData: React.FC<WeekToWeekDataProps> = ({
  metaInfo,
  top,
  statistics,
  tournamentGroups,
  processedTournamentGroups,
  handleWeekSelect,
}) => {
  const { data: cardListData } = useCardList();
  const labelRenderer = useLabel();
  const { theme } = useTheme();
  const pieChartColorDefinitions = usePieChartColors();

  // Transform the data for the AreaBump chart
  const chartData = useMemo(() => {
    // Filter out upcoming weeks and sort by week number
    const sortedGroups = [...processedTournamentGroups]
      .filter(group => !group.isUpcoming)
      .sort((a, b) => a.weekNumber - b.weekNumber);

    if (sortedGroups.length === 0) return [];

    // Create a map of all unique leader/base combinations across all weeks
    const allCombinations = new Map<string, { id: string; data: any[] }>();

    // First, collect all unique combinations and initialize their data arrays
    sortedGroups.forEach(group => {
      if (group.leaderBase && group.leaderBase.length > 0) {
        group.leaderBase.forEach(leader => {
          const key = getDeckKey2(leader.leaderCardId, leader.baseCardId, metaInfo, cardListData);
          if (!allCombinations.has(key)) {
            allCombinations.set(key, {
              id: key,
              data: [],
            });
          }
        });
      }
    });

    // Then, for each week, add data points for each combination
    sortedGroups.forEach(group => {
      // Create a map to store the counts for this week
      const weekCounts = new Map<string, number>();

      // Calculate counts for each combination in this week
      if (group.leaderBase && group.leaderBase.length > 0) {
        group.leaderBase.forEach(leader => {
          const key = getDeckKey2(leader.leaderCardId, leader.baseCardId, metaInfo, cardListData);

          // Use the appropriate count based on the 'top' prop
          let count = 0;
          if (top === 'champions') {
            count = leader.winner;
          } else if (top === 'top8') {
            count = leader.top8;
          } else {
            count = leader.total;
          }

          weekCounts.set(key, (weekCounts.get(key) || 0) + count);
        });
      }

      // Add data points for each combination
      allCombinations.forEach((value, key) => {
        value.data.push({
          x: group.weekNumber,
          y: weekCounts.get(key) || 0,
          groupId: group.group.id,
        });
      });
    });

    // Convert the map to an array and filter out combinations with all zeros
    const result = Array.from(allCombinations.values()).filter(item => {
      return item.data.some(point => point.y > 0);
    });

    // Sort by the sum of y values (descending)
    result.sort((a, b) => {
      const sumA = a.data.reduce((sum, point) => sum + point.y, 0);
      const sumB = b.data.reduce((sum, point) => sum + point.y, 0);
      return sumB - sumA;
    });

    console.log({ result });

    result[0].data[3].y = -1;

    // Take only the top 10 combinations to avoid cluttering the chart
    return result.slice(0, 10);
  }, [processedTournamentGroups, metaInfo, top, cardListData]);

  // Generate chart definitions using pieChartColorDefinitions
  const chartDefs = useMemo(() => {
    return chartData.map(item => pieChartColorDefinitions(item.id, metaInfo));
  }, [chartData, metaInfo, pieChartColorDefinitions]);

  // Create fill patterns for each item
  const fill = useMemo(() => {
    return chartData.map(item => ({
      match: { id: item.id },
      id: item.id,
    }));
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-md">
        <h2 className="text-2xl font-bold text-muted-foreground">
          No data available for week-to-week comparison
        </h2>
      </div>
    );
  }

  console.log({ chartData });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Week-to-Week {top === 'champions' ? 'Champions' : top === 'top8' ? 'Top 8' : 'Total'}{' '}
          Trends
        </CardTitle>
        <CardDescription>
          Showing trends for top {chartData.length} {metaInfo} combinations across weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: 500 }}>
          <ResponsiveAreaBump
            data={chartData}
            margin={{ top: 40, right: 100, bottom: 40, left: 100 }}
            spacing={4}
            colors={['#3B3B3B']} // Use the same base color as PQStatPieChart
            blendMode="multiply"
            defs={chartDefs}
            fill={fill}
            startLabel={datum => labelRenderer(datum.id as string, metaInfo, 'text') as string}
            endLabel={datum => labelRenderer(datum.id as string, metaInfo, 'text') as string}
            axisTop={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Week',
              legendPosition: 'middle',
              legendOffset: -36,
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Week',
              legendPosition: 'middle',
              legendOffset: 32,
            }}
            tooltip={({ serie, index }) => (
              <div className="bg-card p-2 rounded-md shadow-md border">
                <div className="flex items-center gap-2">
                  {labelRenderer(serie.id as string, metaInfo, 'compact')}
                  <span className="font-bold">{JSON.stringify(serie)}</span>
                  <span className="text-xs">Week {JSON.stringify(serie)}</span>
                </div>
              </div>
            )}
            onClick={(data, event) => {
              if (data.data.groupId) {
                handleWeekSelect(data.data.groupId);
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekToWeekData;
