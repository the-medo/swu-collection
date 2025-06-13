import * as React from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { isFuture } from 'date-fns';
import { Check, X, Users, PieChart } from 'lucide-react';
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
import { Button } from '@/components/ui/button.tsx';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup.ts';

interface WeekColumnsProps {
  pqWeekGroups: TournamentGroupWithMeta[];
  mostRecentWeekIndex: number;
  openAllCollapsibles?: boolean;
}

const WeekColumns: React.FC<WeekColumnsProps> = ({
  pqWeekGroups,
  mostRecentWeekIndex,
  openAllCollapsibles = false,
}) => {
  const currentDate = new Date();
  const navigate = useNavigate({ from: Route.fullPath });
  const { weekId } = useSearch({ strict: false });

  // State to track which collapsibles are open
  const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({});

  // Effect to handle openAllCollapsibles prop change
  React.useEffect(() => {
    // Create an object with all group IDs set to true (open)
    const allOpen = pqWeekGroups.reduce(
      (acc, group) => {
        acc[group.group.id] = openAllCollapsibles;
        return acc;
      },
      {} as Record<string, boolean>,
    );

    setOpenCollapsibles(allOpen);
  }, [openAllCollapsibles, pqWeekGroups]);

  // Determine if a week is upcoming (has tournaments with dates in the future)
  const isUpcomingWeek = (group: TournamentGroupWithMeta) => {
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
        const isUpcoming = isUpcomingWeek(group);
        let bgColor = '';
        if (group.group.id === weekId) {
          bgColor = 'bg-green-100/50 dark:bg-green-900/30 text-foreground'; // Selected week (green)
        } else if (isUpcomingWeek(group)) {
          bgColor = 'bg-blue-100/50 dark:bg-blue-900/30 text-foreground'; // Upcoming week (blue)
        }

        // Count tournaments in this group
        const tournamentCount = group.tournaments.length;
        const importedTournamentCount = group.tournaments.filter(t => t.tournament.imported).length;

        return (
          <div key={group.group.id} className={`min-w-[250px] border rounded-md p-2 ${bgColor}`}>
            <div className="flex justify-between items-start">
              <h3
                className="text-xl font-bold mb-2 cursor-pointer transition-colors"
                onClick={() => handleWeekClick(group.group.id, isUpcoming)}
              >
                Week {group.group.name.match(/^PQ Week (\d+)$/)?.[1]}
              </h3>
              <div className="flex items-center">
                {index === mostRecentWeekIndex && <RecentBadge />}
                {isUpcoming ? (
                  <UpcomingBadge date={group.tournaments[0]?.tournament.date} />
                ) : (
                  <Link
                    to="/meta"
                    search={{ maTournamentGroupId: group.group.id }}
                    className="ml-2"
                  >
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <PieChart className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            {group.group.description && (
              <p className="text-gray-600 dark:text-gray-400">{group.group.description}</p>
            )}

            <Collapsible
              open={openCollapsibles[group.group.id] || false}
              onOpenChange={open => {
                setOpenCollapsibles(prev => ({
                  ...prev,
                  [group.group.id]: open,
                }));
              }}
            >
              <CollapsibleTrigger className="flex items-center text-left w-full text-sm underline decoration-dotted">
                {importedTournamentCount} / {tournamentCount} tournaments{' '}
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2">
                <table className="w-full text-sm">
                  <tbody>
                    {(() => {
                      // Track the current continent to detect changes
                      let currentContinent = '';

                      return group.tournaments.map(tournamentItem => {
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
                              {!isFutureDate && (
                                <>
                                  <td className="py-2 w-12 text-right">
                                    {tournamentItem.tournament.attendance > 0 && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <span>{tournamentItem.tournament.attendance}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 w-8 text-right">{statusIcon}</td>
                                </>
                              )}
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
