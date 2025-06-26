import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WeekToWeekAreaBumpChart from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/data-view/WeekToWeekAreaBumpChart.tsx';
import { useWeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import DataViewTypeSelector from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/DataViewTypeSelector.tsx';
import WtwViewModeSelector from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/WtwViewModeSelector.tsx';
import { useSearch } from '@tanstack/react-router';

interface WeekToWeekDataProps {
  metaInfo: MetaInfo;
  top: PQTop;
  statistics: TournamentStatistics;
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: ProcessedTournamentGroup[];
}

const WeekToWeekData: React.FC<WeekToWeekDataProps> = ({
  metaInfo,
  top,
  processedTournamentGroups,
}) => {
  const { pqWtwDataViewType = 'count', pqWtwViewMode = 'chart' } = useSearch({ strict: false });
  const data = useWeekToWeekData(processedTournamentGroups, metaInfo);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Week-to-Week {top === 'champions' ? 'Champions' : top === 'top8' ? 'Top 8' : 'Total'}{' '}
            Trends
          </CardTitle>
          <div className="flex gap-2">
            <WtwViewModeSelector />
            <div className="w-0 border-r"></div>
            <DataViewTypeSelector />
          </div>
        </div>
        <CardDescription>
          Showing trends for top {metaInfo} combinations across weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pqWtwViewMode === 'chart' ? (
          <WeekToWeekAreaBumpChart
            data={data}
            top={top}
            metaInfo={metaInfo}
            viewType={pqWtwDataViewType}
          />
        ) : (
          <div className="flex items-center justify-center p-12 border rounded-md">
            <h2 className="text-2xl font-bold text-muted-foreground">Table view coming soon</h2>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeekToWeekData;
