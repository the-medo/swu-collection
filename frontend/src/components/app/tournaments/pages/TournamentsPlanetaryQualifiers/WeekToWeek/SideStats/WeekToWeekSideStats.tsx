import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { useWeekToWeekStore } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import { useWeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import SideStatViewSelector from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/SideStatViewSelector.tsx';
import SideStatWeekOverviewTable from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/SideStats/SideStatWeekOverviewTable.tsx';

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
  top,
  statistics,
  tournamentGroups,
  processedTournamentGroups,
  handleWeekSelect,
}) => {
  const { weekIdToCompare, deckKey, pqSideStatView } = useWeekToWeekStore();
  const data = useWeekToWeekData(processedTournamentGroups, metaInfo);

  return (
    <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3 border rounded-md pb-4 mb-4">
      <div className="p-4 border-b">
        <SideStatViewSelector />
      </div>

      {pqSideStatView === 'week' ? (
        <div className="flex flex-col items-center justify-center">
          <SideStatWeekOverviewTable weekId={weekIdToCompare} data={data} metaInfo={metaInfo} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6">
          <h3 className="text-lg font-medium mb-2">Deck weekly Meta shift</h3>
          <p className="text-muted-foreground">
            {deckKey ? `Selected deck: ${deckKey}` : 'No deck selected'}
          </p>
          <div className="mt-4 p-4 bg-muted/50 rounded-md w-full max-w-md">
            <p className="text-sm text-center">
              This view shows how a specific deck has performed across different weeks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekToWeekSideStats;
