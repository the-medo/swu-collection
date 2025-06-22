import * as React from 'react';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';

interface WeekToWeekDataProps {
  statistics: TournamentStatistics;
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: ProcessedTournamentGroup[];
  handleWeekSelect: (tournamentGroupId: string) => void;
}

const WeekToWeekData: React.FC<WeekToWeekDataProps> = ({
  statistics,
  tournamentGroups,
  processedTournamentGroups,
  handleWeekSelect,
}) => {
  return (
    <div className="flex items-center justify-center p-12 border rounded-md">
      <h2 className="text-2xl font-bold text-muted-foreground">TBD</h2>
    </div>
  );
};

export default WeekToWeekData;
