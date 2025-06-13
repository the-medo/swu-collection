import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { isFuture } from 'date-fns';
import { Calendar, CheckCircle, PieChart, Trophy, Users } from 'lucide-react';
import WeekSelector, { ALL_WEEKS_VALUE } from './WeekSelector.tsx';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import PQPageNavigation from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/PQPageNavigation.tsx';
import { useMemo, useState } from 'react';
import MetaInfoSelector, {
  MetaInfo,
} from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import PQStatPieChart from './PQStatPieChart.tsx';
import PQStatChart from './PQStatChart.tsx';
import { Button } from '@/components/ui/button.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
  onOpenAllTournaments?: () => void;
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups, onOpenAllTournaments }) => {
  // State for metaInfo selection
  const [metaInfo, setMetaInfo] = useState<MetaInfo>('leaders');
  // Get card list data
  const { data: cardListData } = useCardList();
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
  const { weekId, page = 'champions' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  // Convert page to the format expected by our chart components
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

  // Find the 5 biggest tournaments across all groups
  const topTournaments = useMemo(() => {
    // Extract all tournaments from all groups
    const allTournaments = tournamentGroups.flatMap(group =>
      group.tournaments.map(t => ({
        ...t,
        weekNumber:
          processedTournamentGroups.find(pg => pg.group.id === group.group.id)?.weekNumber || 0,
        groupId: group.group.id,
      })),
    );

    // Sort by attendance (descending) and take the top 5
    return allTournaments
      .filter(t => t.tournament.attendance > 0) // Only include tournaments with attendance
      .sort((a, b) => b.tournament.attendance - a.tournament.attendance)
      .slice(0, 5);
  }, [tournamentGroups, processedTournamentGroups]);

  // Find the 3 most unusual champion leaders
  const unusualChampions = useMemo(() => {
    // Calculate total attendance across all tournaments
    const totalAttendance = tournamentGroups
      .flatMap(group => group.tournaments.map(t => t.tournament.attendance))
      .reduce((sum, attendance) => sum + attendance, 0);

    // Combine leaderBase data from all tournament groups
    const allLeaders = tournamentGroups.flatMap(group => group.leaderBase || []);

    // Group by leaderCardId to get total occurrences for each leader
    const leaderStats = allLeaders.reduce(
      (acc, leader) => {
        if (!acc[leader.leaderCardId]) {
          acc[leader.leaderCardId] = {
            leaderCardId: leader.leaderCardId,
            winner: 0,
            total: 0,
          };
        }
        acc[leader.leaderCardId].winner += leader.winner;
        acc[leader.leaderCardId].total += leader.total;
        return acc;
      },
      {} as Record<string, { leaderCardId: string; winner: number; total: number }>,
    );

    // Convert to array, filter winners, and sort by rarity
    return Object.values(leaderStats)
      .filter(leader => leader.winner > 0) // Only include leaders that won at least one tournament
      .sort((a, b) => a.total - b.total) // Sort by total occurrences (ascending)
      .slice(0, 4); // Take the top 3 rarest
  }, [tournamentGroups]);

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

      <div className="flex flex-col gap-4 md:col-span-4 lg:col-span-3 border">
        {/* Imported Tournaments Card */}
        <div className="flex items-center justify-between border-y p-4">
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
        <div className="border-b pb-4 px-4">
          <h4 className="text-md font-medium">Unusual champions</h4>
          <div className="flex flex-wrap justify-around gap-2">
            {unusualChampions.map(champion => {
              const card = cardListData?.cards?.[champion.leaderCardId];
              const cardVariantId = card ? selectDefaultVariant(card) : undefined;

              return (
                <div key={champion.leaderCardId} className="flex flex-col items-center">
                  <CardImage
                    card={card}
                    cardVariantId={cardVariantId}
                    size="w75"
                    backSideButton={false}
                    forceHorizontal={true}
                  />
                  <span className="text-xs mt-1">{champion.leaderCardId}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Biggest Tournaments Table */}
        <div className="border-b pb-4 px-4">
          <h4 className="text-md font-medium">Top 5 Biggest Tournaments</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-1 px-2 text-left">Week</th>
                  <th className="py-1 px-2 text-left">Tournament</th>
                  <th className="py-1 px-2 text-right">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {topTournaments.map(tournament => {
                  // Remove "PQ - " prefix from tournament name
                  const displayName = tournament.tournament.name.replace(/^PQ - /, '');
                  const countryCode = tournament.tournament.location as CountryCode;

                  return (
                    <tr
                      key={tournament.tournament.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 px-2">
                        <span
                          className="underline cursor-pointer"
                          onClick={() => handleWeekSelect(tournament.groupId)}
                        >
                          Week {tournament.weekNumber}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center">
                          <Flag countryCode={countryCode} className="mr-2" />
                          <Link
                            to="/tournaments/$tournamentId"
                            params={{
                              tournamentId: tournament.tournament.id,
                            }}
                          >
                            {displayName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{tournament.tournament.attendance}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Button variant="ghost" onClick={onOpenAllTournaments}>
              <PieChart className="h-4 w-4" />
              Toggle all week tournaments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PQStatistics;
