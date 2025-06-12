import * as React from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { isFuture } from 'date-fns';
import { ChevronDown, Check, X, Users } from 'lucide-react';
import { Route } from '@/routes/__root.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import RecentBadge from '../../components/RecentBadge.tsx';
import UpcomingBadge from '../../components/UpcomingBadge.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { CountryCode } from '../../../../../../../server/db/lists.ts';

interface WeekColumnsProps {
  pqWeekGroups: any[];
  mostRecentWeekIndex: number;
}

const WeekColumns: React.FC<WeekColumnsProps> = ({ pqWeekGroups, mostRecentWeekIndex }) => {
  const currentDate = new Date();
  const navigate = useNavigate({ from: Route.fullPath });
  const { weekId } = useSearch({ strict: false });

  // Determine if a week is upcoming (has tournaments with dates in the future)
  const isUpcomingWeek = (group: any) => {
    return group.tournaments.some(tournament => {
      const tournamentDate = new Date(tournament.tournament.date);
      return tournamentDate > currentDate;
    });
  };

  // Handle week title click
  const handleWeekClick = (weekId: string, isUpcoming: boolean) => {
    // Don't navigate if the week is upcoming
    if (isUpcoming) return;

    // Update the URL with the selected week ID
    navigate({
      search: prev => ({
        ...prev,
        weekId,
      }),
    });
  };

  return (
    <div className="flex flex-row gap-2 overflow-x-auto pb-2">
      {pqWeekGroups.map((group, index) => {
        // Determine background color based on week status
        let bgColor = '';
        if (group.group.id === weekId) {
          bgColor = 'bg-green-100/50 dark:bg-green-900/30 text-foreground'; // Selected week (green)
        } else if (isUpcomingWeek(group)) {
          bgColor = 'bg-blue-100/50 dark:bg-blue-900/30 text-foreground'; // Upcoming week (blue)
        }

        // Count tournaments in this group
        const tournamentCount = group.tournaments.length;

        return (
          <div key={group.group.id} className={`min-w-[250px] border rounded-md p-2 ${bgColor}`}>
            <div className="flex justify-between items-start">
              <h3
                className="text-xl font-bold mb-2 cursor-pointer transition-colors"
                onClick={() => handleWeekClick(group.group.id, isUpcomingWeek(group))}
              >
                Week {group.group.name.match(/^PQ Week (\d+)$/)?.[1]}
              </h3>
              {index === mostRecentWeekIndex && <RecentBadge />}
              {isUpcomingWeek(group) && (
                <UpcomingBadge date={group.tournaments[0]?.tournament.date} />
              )}
            </div>
            {group.group.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{group.group.description}</p>
            )}

            <Collapsible className="mt-2">
              <CollapsibleTrigger className="flex items-center text-left w-full">
                <h6 className="text-md font-medium">Tournaments ({tournamentCount})</h6>
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
                        const displayName = tournamentItem.tournament.name.replace(/^PQ - /, '');

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
                              <td className="py-2">
                                <Link
                                  to="/tournaments/$tournamentId"
                                  params={{
                                    tournamentId: tournamentItem.tournament.id,
                                  }}
                                >
                                  {displayName}
                                </Link>
                              </td>
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
  );
};

export default WeekColumns;
