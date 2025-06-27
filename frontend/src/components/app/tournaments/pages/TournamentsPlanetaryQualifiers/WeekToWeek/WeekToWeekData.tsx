import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WeekToWeekAreaBumpChart from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/data-view/WeekToWeekAreaBumpChart.tsx';
import WeekToWeekDataTable from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/data-view/WeekToWeekDataTable.tsx';
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
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <h3 className="mb-0">
          Week-to-Week {top === 'champions' ? 'Champions' : top === 'top8' ? 'Top 8' : 'Total'}{' '}
          Trends
        </h3>
        <div className="flex gap-2">
          <WtwViewModeSelector />
          <div className="w-0 border-r"></div>
          <DataViewTypeSelector />
        </div>
      </div>
      {pqWtwViewMode === 'chart' ? (
        <WeekToWeekAreaBumpChart
          data={data}
          top={top}
          metaInfo={metaInfo}
          viewType={pqWtwDataViewType}
        />
      ) : (
        <WeekToWeekDataTable
          data={data}
          top={top}
          metaInfo={metaInfo}
          viewType={pqWtwDataViewType}
        />
      )}
    </div>
  );
};

export default WeekToWeekData;
