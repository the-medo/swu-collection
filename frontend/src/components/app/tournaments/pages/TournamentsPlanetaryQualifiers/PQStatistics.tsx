import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { isFuture } from 'date-fns';
import { Calendar, CheckCircle, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import WeekSelector from './WeekSelector.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import PQPageNavigation from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQPageNavigation.tsx';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups }) => {
  // Calculate statistics
  const statistics = React.useMemo(() => {
    // Flatten all tournaments from all groups
    const allTournaments = tournamentGroups.flatMap(group =>
      group.tournaments.map(t => t.tournament),
    );

    // Total number of tournaments
    const totalTournaments = allTournaments.length;

    // Number of imported tournaments
    const importedTournaments = allTournaments.filter(t => t.imported).length;

    // Number of upcoming tournaments
    const upcomingTournaments = allTournaments.filter(t => isFuture(new Date(t.date))).length;

    return {
      totalTournaments,
      importedTournaments,
      upcomingTournaments,
    };
  }, [tournamentGroups]);

  // Process tournament groups for the select component
  const processedTournamentGroups = React.useMemo(() => {
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

  // Get the selected tournament group ID from the URL
  const { weekId } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

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
                      <h4 className="text-lg font-semibold mb-2">
                        Week {selectedGroup.weekNumber} Details
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedGroup.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="p-2 bg-muted/30 rounded">
                          <p className="text-sm font-medium">Tournaments</p>
                          <p className="text-xl">{selectedGroup.tournaments.length}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                          <p className="text-sm font-medium">Status</p>
                          <p className="text-xl">
                            {selectedGroup.isUpcoming ? 'Upcoming' : 'Completed'}
                          </p>
                        </div>
                      </div>

                      {selectedGroup.meta && (
                        <div className="mt-4">
                          <p className="text-sm font-medium">Meta</p>
                          <p>{selectedGroup.meta.name}</p>
                        </div>
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
