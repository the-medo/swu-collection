import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useGetTournamentGroups } from '@/api/tournament-groups';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { ChevronDown, Check, X, Users } from 'lucide-react';
import { isFuture } from 'date-fns';
import PQPageNavigation from './PQPageNavigation';
import RecentBadge from '../../components/RecentBadge';
import UpcomingBadge from '../../components/UpcomingBadge';
import Flag from '@/components/app/global/Flag';
import { CountryCode } from '../../../../../../../server/db/lists.ts';

interface TournamentsPlanetaryQualifiersProps {}

const TournamentsPlanetaryQualifiers: React.FC<TournamentsPlanetaryQualifiersProps> = ({}) => {
  const { metaId, page = 'tournaments' } = useSearch({ strict: false });
  const params = useMemo(
    () => ({
      meta: metaId,
      visible: false,
    }),
    [metaId],
  );

  const { data: tournamentGroupsData, isLoading } = useGetTournamentGroups(params);

  // Filter and sort PQ Week tournament groups
  const pqWeekGroups = useMemo(() => {
    if (!tournamentGroupsData) return [];

    // Extract all tournament groups
    const allGroups = tournamentGroupsData.pages.flatMap(page => page.data);

    // Filter groups that match the "PQ Week ${weekNumber}" pattern
    const filteredGroups = allGroups.filter(group => {
      const match = group.group.name.match(/^PQ Week (\d+)$/);
      return match !== null;
    });

    // Sort groups by week number
    return filteredGroups.sort((a, b) => {
      const weekNumberA = parseInt(a.group.name.match(/^PQ Week (\d+)$/)?.[1] || '0', 10);
      const weekNumberB = parseInt(b.group.name.match(/^PQ Week (\d+)$/)?.[1] || '0', 10);
      return weekNumberA - weekNumberB;
    });
  }, [tournamentGroupsData]);

  // Determine the most recent and upcoming weeks
  const currentDate = new Date();

  // Find the most recent week (the week with the latest tournament date that is in the past)
  const mostRecentWeekIndex = useMemo(() => {
    if (!pqWeekGroups.length) return -1;

    // Find the latest tournament date for each week
    const weekDates = pqWeekGroups.map(group => {
      const latestDate = group.tournaments.reduce((latest, tournament) => {
        const tournamentDate = new Date(tournament.tournament.date);
        return tournamentDate > latest ? tournamentDate : latest;
      }, new Date(0));
      return latestDate;
    });

    // Find the most recent week (latest date that is in the past)
    let mostRecentIndex = -1;
    let mostRecentDate = new Date(0);

    weekDates.forEach((date, index) => {
      if (date <= currentDate && date > mostRecentDate) {
        mostRecentDate = date;
        mostRecentIndex = index;
      }
    });

    return mostRecentIndex;
  }, [pqWeekGroups]);

  // Determine if a week is upcoming (has tournaments with dates in the future)
  const isUpcomingWeek = (group: any) => {
    return group.tournaments.some(tournament => {
      const tournamentDate = new Date(tournament.tournament.date);
      return tournamentDate > currentDate;
    });
  };

  return (
    <>
      <TournamentNavigation />
      <TournamentPageHeader title="Planetary Qualifiers" />
      <PQPageNavigation />

      {isLoading && (
        <div className="p-8 text-center">
          <p>Loading tournament groups...</p>
        </div>
      )}

      {!isLoading && (!metaId || !pqWeekGroups.length) && (
        <div className="p-8 text-center text-gray-500">
          <p>
            {metaId
              ? 'No Planetary Qualifiers tournament groups found.'
              : 'Please select a meta to view Planetary Qualifiers.'}
          </p>
        </div>
      )}

      {metaId && pqWeekGroups.length > 0 && (
        <div className="p-2">
          <div className="flex flex-row gap-2 overflow-x-auto pb-2">
            {pqWeekGroups.map((group, index) => {
              // Determine background color based on week status
              let bgColor = '';
              if (index === mostRecentWeekIndex) {
                bgColor = 'bg-green-100/50 dark:bg-green-900/30 text-foreground'; // Most recent week (green)
              } else if (isUpcomingWeek(group)) {
                bgColor = 'bg-blue-100/50 dark:bg-blue-900/30 text-foreground'; // Upcoming week (blue)
              }

              // Count tournaments in this group
              const tournamentCount = group.tournaments.length;

              return (
                <div
                  key={group.group.id}
                  className={`min-w-[250px] border rounded-md p-2 ${bgColor}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold mb-2">
                      Week {group.group.name.match(/^PQ Week (\d+)$/)?.[1]}
                    </h3>
                    {index === mostRecentWeekIndex && <RecentBadge />}
                    {isUpcomingWeek(group) && (
                      <UpcomingBadge date={group.tournaments[0]?.tournament.date} />
                    )}
                  </div>
                  {group.group.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {group.group.description}
                    </p>
                  )}

                  <Collapsible className="mt-2">
                    <CollapsibleTrigger className="flex items-center text-left w-full">
                      <h4 className="text-md font-medium">Tournaments ({tournamentCount})</h4>
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-2">
                      <table className="w-full text-sm">
                        <tbody>
                          {(() => {
                            // Track the current continent to detect changes
                            let currentContinent = '';

                            return group.tournaments.map((tournamentItem, idx) => {
                              // Remove "PQ - " prefix from tournament name
                              const displayName = tournamentItem.tournament.name.replace(
                                /^PQ - /,
                                '',
                              );

                              const countryCode = tournamentItem.tournament.location as CountryCode;

                              const tournamentDate = new Date(tournamentItem.tournament.date);
                              const isFutureDate = isFuture(tournamentDate);

                              let statusIcon = null;
                              if (!isFutureDate) {
                                if (tournamentItem.tournament.imported) {
                                  statusIcon = <Check className="h-4 w-4 text-green-500" />;
                                } else {
                                  statusIcon = <X className="h-4 w-4 text-red-500" />;
                                }
                              }

                              // Check if continent has changed
                              const isNewContinent =
                                currentContinent !== tournamentItem.tournament.continent;
                              if (isNewContinent) {
                                currentContinent = tournamentItem.tournament.continent;
                              }

                              return (
                                <React.Fragment key={tournamentItem.tournament.id}>
                                  {isNewContinent && (
                                    <tr className="bg-muted/50">
                                      <td colSpan={4} className="py-1 px-2 font-medium">
                                        {currentContinent}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="p-1 w-6">
                                      <Flag countryCode={countryCode} />
                                    </td>
                                    <td className="py-2">{displayName}</td>
                                    <td className="py-2 w-12 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <span>{tournamentItem.tournament.attendance}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 w-8 text-right">{statusIcon}</td>
                                  </tr>
                                </React.Fragment>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          {/* Page-specific content */}
          {page === 'top8' && (
            <div className="mt-4">
              <p className="text-center text-muted-foreground">
                Top 8 content will be displayed here.
              </p>
            </div>
          )}

          {/* Winners page */}
          {page === 'winners' && (
            <div className="mt-4">
              <p className="text-center text-muted-foreground">
                Winners content will be displayed here.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TournamentsPlanetaryQualifiers;
