import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';

interface WeekToWeekSideStatsProps {
  statistics: TournamentStatistics;
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: ProcessedTournamentGroup[];
  handleWeekSelect: (tournamentGroupId: string) => void;
}

const WeekToWeekSideStats: React.FC<WeekToWeekSideStatsProps> = ({
  statistics,
  tournamentGroups,
  processedTournamentGroups,
  handleWeekSelect,
}) => {
  return (
    <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3 border rounded-md pb-4 mb-4">
      <div className="flex items-center justify-center p-12">
        <h2 className="text-2xl font-bold text-muted-foreground">TBD</h2>
      </div>
    </div>
  );
};

export default WeekToWeekSideStats;
