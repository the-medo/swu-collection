import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { Calendar, CheckCircle } from 'lucide-react';
import TopTournaments from './TopTournaments.tsx';
import UnusualChampions from './UnusualChampions/UnusualChampions.tsx';
import { TournamentStatistics } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useStatistics.ts';
import { ProcessedTournamentGroup } from './hooks/useProcessedTournamentGroups.ts';

interface PQSideStatsProps {
  statistics: TournamentStatistics;
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: ProcessedTournamentGroup[];
  handleWeekSelect: (tournamentGroupId: string) => void;
  onOpenAllTournaments?: () => void;
}

const PQSideStats: React.FC<PQSideStatsProps> = ({
  statistics,
  tournamentGroups,
  processedTournamentGroups,
  handleWeekSelect,
  onOpenAllTournaments,
}) => {
  return (
    <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3 border rounded-md pb-4 mb-4">
      {/* Imported Tournaments Card */}
      <div className="flex items-center justify-between flex-wrap border-b p-4">
        <div className="flex items-center gap-4">
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Imported PQs</p>
            <h3 className="text-2xl font-bold">
              {statistics.importedTournaments} / {statistics.totalTournaments}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Upcoming</p>
            <h3 className="text-2xl font-bold">{statistics.upcomingTournaments}</h3>
          </div>
        </div>
      </div>

      {/* Unusual Champions Section */}
      <UnusualChampions tournamentGroups={tournamentGroups} handleWeekSelect={handleWeekSelect} />

      {/* Top 5 Biggest Tournaments Table */}
      <TopTournaments
        tournamentGroups={tournamentGroups}
        processedTournamentGroups={processedTournamentGroups}
        handleWeekSelect={handleWeekSelect}
        onOpenAllTournaments={onOpenAllTournaments}
      />
    </div>
  );
};

export default PQSideStats;
