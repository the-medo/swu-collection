import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import {
  useWeekToWeekStore,
  useWeekToWeekStoreActions,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import { useWeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import SideStatViewSelector from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/SideStatViewSelector.tsx';
import SideStatWeekOverviewTable from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/SideStatWeekOverviewTable.tsx';
import SideStatWeeklyShiftTable from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/SideStatWeeklyShiftTable.tsx';
import { useEffect } from 'react';

interface WeekToWeekSideStatsProps {
  metaInfo: MetaInfo;
  top: PQTop;
  statistics: TournamentStatistics;
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: ProcessedTournamentGroup[];
  handleWeekSelect: (tournamentGroupId: string) => void;
}

const WeekToWeekSideStats: React.FC<WeekToWeekSideStatsProps> = ({
  metaInfo,
  processedTournamentGroups,
}) => {
  const { weekIdToCompare, deckKey, pqSideStatView } = useWeekToWeekStore();
  const { setDeckKey } = useWeekToWeekStoreActions();
  const data = useWeekToWeekData(processedTournamentGroups, metaInfo);

  useEffect(() => {
    setDeckKey(null);
  }, [metaInfo]);

  return (
    <div className="flex flex-col gap-2 lg:col-span-4 xl:col-span-3 border rounded-md pb-2 mb-2">
      <div className="p-2 border-b">
        <SideStatViewSelector />
      </div>

      <div className="flex flex-col items-center justify-center">
        {pqSideStatView === 'week' ? (
          <SideStatWeekOverviewTable weekId={weekIdToCompare} data={data} metaInfo={metaInfo} />
        ) : (
          <SideStatWeeklyShiftTable deckKey={deckKey} data={data} metaInfo={metaInfo} />
        )}
      </div>
    </div>
  );
};

export default WeekToWeekSideStats;
