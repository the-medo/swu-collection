import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { Calendar, CheckCircle } from 'lucide-react';
import WeekSelector, { ALL_WEEKS_VALUE } from './WeekSelector.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import PQPageNavigation from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQPageNavigation.tsx';
import { useState } from 'react';
import MetaInfoSelector, {
  MetaInfo,
} from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import PQStatPieChart from './PQStatPieChart.tsx';
import PQStatChart from './PQStatChart.tsx';
import TopTournaments from './TopTournaments.tsx';
import UnusualChampions from './UnusualChampions.tsx';
import { useStatistics } from './hooks/useStatistics.ts';
import { useProcessedTournamentGroups } from './hooks/useProcessedTournamentGroups.ts';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
  onOpenAllTournaments?: () => void;
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups, onOpenAllTournaments }) => {
  const [metaInfo, setMetaInfo] = useState<MetaInfo>('leaders');

  const statistics = useStatistics(tournamentGroups);
  const processedTournamentGroups = useProcessedTournamentGroups(tournamentGroups);

  const { weekId, page = 'champions' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const chartTop = (page === 'tournaments' ? 'total' : page) as 'champions' | 'top8' | 'total';

  // Find the most recent group ID for default selection
  const mostRecentGroupId = React.useMemo(() => {
    const mostRecentGroup = processedTournamentGroups.find(group => group.isMostRecent);
    return mostRecentGroup?.group.id || null;
  }, [processedTournamentGroups]);

  // Use the weekId from the URL or default to the most recent group
  const selectedGroupId = weekId || mostRecentGroupId;

  // Handle week selection
  const handleWeekSelect = (tournamentGroupId: string) => {
    console.log(`Selected tournament group: ${tournamentGroupId}`);
    // Update the URL with the selected tournament group ID
    navigate({
      search: prev => ({
        ...prev,
        weekId: tournamentGroupId,
      }),
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Tournament Information Section */}
      <div className="md:col-span-8 lg:col-span-9 space-y-2">
        <WeekSelector
          value={selectedGroupId || undefined}
          onValueChange={handleWeekSelect}
          processedTournamentGroups={processedTournamentGroups}
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <PQPageNavigation />
          <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
        </div>

        {/* Display information about the selected week */}
        {selectedGroupId && (
          <div>
            {(() => {
              // Handle "All weeks" selection
              if (selectedGroupId === ALL_WEEKS_VALUE) {
                // Combine leaderBase data from all tournament groups
                const combinedLeaderBase = processedTournamentGroups.reduce((acc, group) => {
                  if (group.leaderBase && group.leaderBase.length > 0 && !group.isUpcoming) {
                    return [...acc, ...group.leaderBase];
                  }
                  return acc;
                }, []);

                if (combinedLeaderBase.length === 0) {
                  return (
                    <p className="text-muted-foreground">
                      No statistics available across all weeks.
                    </p>
                  );
                }

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <PQStatPieChart
                        metaInfo={metaInfo}
                        data={combinedLeaderBase}
                        top={chartTop}
                      />
                      <PQStatChart metaInfo={metaInfo} data={combinedLeaderBase} top={chartTop} />
                    </div>
                  </>
                );
              }

              // Handle individual week selection
              const selectedGroup = processedTournamentGroups.find(
                group => group.group.id === selectedGroupId,
              );

              if (!selectedGroup) {
                return (
                  <p className="text-muted-foreground">
                    No information available for the selected week.
                  </p>
                );
              }

              return (
                <>
                  {selectedGroup.leaderBase && selectedGroup.leaderBase.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <PQStatPieChart
                        metaInfo={metaInfo}
                        data={selectedGroup.leaderBase}
                        top={chartTop}
                      />
                      <PQStatChart
                        metaInfo={metaInfo}
                        data={selectedGroup.leaderBase}
                        top={chartTop}
                      />
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No statistics available for this tournament group.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 md:col-span-4 lg:col-span-3 border rounded-md pb-4 mb-4">
        {/* Imported Tournaments Card */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mr-4">
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
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <h3 className="text-2xl font-bold">{statistics.upcomingTournaments}</h3>
            </div>
          </div>
        </div>

        {/* Unusual Champions Section */}
        <UnusualChampions tournamentGroups={tournamentGroups} />

        {/* Top 5 Biggest Tournaments Table */}
        <TopTournaments
          tournamentGroups={tournamentGroups}
          processedTournamentGroups={processedTournamentGroups}
          handleWeekSelect={handleWeekSelect}
          onOpenAllTournaments={onOpenAllTournaments}
        />
      </div>
    </div>
  );
};

export default PQStatistics;
