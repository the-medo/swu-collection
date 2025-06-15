import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import { Button } from '@/components/ui/button.tsx';
import { PieChart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TournamentWinningDeckTooltip } from './TournamentWinningDeckTooltip.tsx';
import { useMemo } from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';

interface TopTournamentsProps {
  tournamentGroups: TournamentGroupWithMeta[];
  processedTournamentGroups: {
    weekNumber: number;
    group: {
      id: string;
    };
  }[];
  handleWeekSelect: (groupId: string) => void;
  onOpenAllTournaments?: () => void;
}

const TopTournaments: React.FC<TopTournamentsProps> = ({
  tournamentGroups,
  processedTournamentGroups,
  handleWeekSelect,
  onOpenAllTournaments,
}) => {
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

  return (
    <div className="pb-4 px-4">
      <h4 className="text-md font-medium">Top 5 Biggest PQs</h4>
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
                <TooltipProvider key={tournament.tournament.id}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <tr className="border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-muted/50">
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
                    </TooltipTrigger>
                    <TooltipContent side="right" className="p-0">
                      <TournamentWinningDeckTooltip tournamentId={tournament.tournament.id} />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </tbody>
        </table>
        {onOpenAllTournaments && (
          <Button variant="ghost" onClick={onOpenAllTournaments}>
            <PieChart className="h-4 w-4" />
            Toggle all week tournaments
          </Button>
        )}
      </div>
    </div>
  );
};

export default TopTournaments;
