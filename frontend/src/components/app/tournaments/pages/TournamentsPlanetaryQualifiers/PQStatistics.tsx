import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { isFuture } from 'date-fns';
import { Calendar, CheckCircle, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import WeekSelector from './WeekSelector.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import PQPageNavigation from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQPageNavigation.tsx';
import { useMemo, useState } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import PQStatPieChart from './PQStatPieChart.tsx';
import PQStatChart from './PQStatChart.tsx';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups }) => {
  // State for metaInfo selection
  const [metaInfo, setMetaInfo] = useState<MetaInfo>('leaders');
  // Calculate statistics
  const statistics = useMemo(() => {
    const allTournaments = tournamentGroups.flatMap(group =>
      group.tournaments.map(t => t.tournament),
    );

    const totalTournaments = allTournaments.length;
    const importedTournaments = allTournaments.filter(t => t.imported).length;
    const upcomingTournaments = allTournaments.filter(t => isFuture(new Date(t.date))).length;

    return {
      totalTournaments,
      importedTournaments,
      upcomingTournaments,
    };
  }, [tournamentGroups]);

  // Process tournament groups for the select component
  const processedTournamentGroups = useMemo(() => {
    // Find the most recent tournament date that is not in the future
    let mostRecentDate = new Date(0); // Initialize with earliest possible date
    let mostRecentGroupIndex = -1;

    // First pass: find the most recent tournament date
    tournamentGroups.forEach((group, index) => {
      group.tournaments.forEach(t => {
        const tournamentDate = new Date(t.tournament.date);
        // If the tournament is not in the future and is more recent than our current most recent
        if (!isFuture(tournamentDate) && tournamentDate > mostRecentDate) {
          mostRecentDate = tournamentDate;
          mostRecentGroupIndex = index;
        }
      });
    });

    return tournamentGroups.map((group, index) => {
      // Check if all tournaments in this group are in the future
      const isUpcoming = group.tournaments.every(t => isFuture(new Date(t.tournament.date)));

      // Determine if this is the most recent group
      const isMostRecent = index === mostRecentGroupIndex;

      // Get the week number from the group or generate one
      const weekNumber = index + 1; // Assuming sequential weeks

      // Generate a description for the group
      // This could be based on dates, tournament names, etc.
      const description = group.group.description || `Tournament Group ${index + 1}`;

      return {
        ...group,
        weekNumber,
        description,
        isMostRecent,
        isUpcoming,
      };
    });
  }, [tournamentGroups]);

  // Get the selected tournament group ID and page from the URL
  const { weekId, page = 'winners' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  // Convert page to the format expected by our chart components
  const chartTop = (page === 'tournaments' ? 'total' : page) as 'winners' | 'top8' | 'total';

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
      {/* Statistics Column */}
      <div className="flex flex-col gap-4 md:col-span-4 lg:col-span-3">
        {/* Total Tournaments Card */}
        <Card>
          <CardContent className="pt-6 flex items-center">
            <div className="bg-primary/10 p-3 rounded-full mr-4">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tournaments</p>
              <h3 className="text-2xl font-bold">{statistics.totalTournaments}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Imported Tournaments Card */}
        <Card>
          <CardContent className="pt-6 flex items-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mr-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Imported Tournaments</p>
              <h3 className="text-2xl font-bold">
                {statistics.importedTournaments} / {statistics.totalTournaments}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tournaments Card */}
        <Card>
          <CardContent className="pt-6 flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Tournaments</p>
              <h3 className="text-2xl font-bold">{statistics.upcomingTournaments}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournament Information Section */}
      <Card className="md:col-span-8 lg:col-span-9">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-[350px]">
                <WeekSelector
                  value={selectedGroupId || undefined}
                  onValueChange={handleWeekSelect}
                  processedTournamentGroups={processedTournamentGroups}
                />
              </div>
              <PQPageNavigation />
            </div>

            {/* Display information about the selected week */}
            {selectedGroupId && (
              <div className="mt-4 p-4 border rounded-md">
                {(() => {
                  const selectedGroup = processedTournamentGroups.find(
                    group => group.group.id === selectedGroupId,
                  );

                  if (!selectedGroup) {
                    return <p>No information available for the selected week.</p>;
                  }

                  return (
                    <>
                      {selectedGroup.leaderBase && selectedGroup.leaderBase.length > 0 ? (
                        <div className="space-y-8">
                          {/* Meta Info Selector */}
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2 items-center">
                              <span className="text-sm font-medium">Group by:</span>
                              <select
                                value={metaInfo}
                                onChange={(e) => setMetaInfo(e.target.value as MetaInfo)}
                                className="p-2 border rounded-md bg-background"
                              >
                                <option value="leaders">Leaders</option>
                                <option value="leadersAndBase">Leaders & Bases</option>
                                <option value="bases">Bases</option>
                              </select>
                            </div>
                          </div>

                          {/* Charts Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pie Chart */}
                            <div>
                              <h3 className="text-lg font-semibold mb-4">Distribution</h3>
                              <PQStatPieChart 
                                metaInfo={metaInfo}
                                data={selectedGroup.leaderBase}
                                top={chartTop}
                              />
                            </div>

                            {/* Bar Chart */}
                            <div>
                              <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
                              <PQStatChart 
                                metaInfo={metaInfo}
                                data={selectedGroup.leaderBase}
                                top={chartTop}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No statistics available for this tournament group.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PQStatistics;
