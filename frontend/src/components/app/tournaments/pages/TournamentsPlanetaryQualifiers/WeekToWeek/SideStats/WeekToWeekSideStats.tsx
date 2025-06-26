import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { useWeekToWeekStore } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import { useWeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';

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
  const { weekIdToCompare, deckKey } = useWeekToWeekStore();
  const data = useWeekToWeekData(processedTournamentGroups, metaInfo);

  return (
    <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3 border rounded-md pb-4 mb-4">
      <div className="flex items-center justify-center p-12">{weekIdToCompare}</div>
      <div className="flex items-center justify-center p-12">{deckKey}</div>
    </div>
  );
};

export default WeekToWeekSideStats;
