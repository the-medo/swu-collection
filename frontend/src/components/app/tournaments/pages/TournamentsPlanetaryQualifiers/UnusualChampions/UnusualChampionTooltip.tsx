import * as React from 'react';
import { useMemo } from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../../types/TournamentGroup.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { CountryCode } from '../../../../../../../../server/db/lists.ts';

// Tooltip component for unusual champions
interface UnusualChampionTooltipProps {
  champion: {
    leaderCardId: string;
    winner: number;
    total: number;
  };
  totalAttendance: number;
  label: ReturnType<typeof useLabel>;
  tournamentGroups: TournamentGroupWithMeta[];
  handleWeekSelect: (groupId: string) => void;
}

const UnusualChampionTooltip: React.FC<UnusualChampionTooltipProps> = ({
  champion,
  totalAttendance,
  label,
  tournamentGroups,
  handleWeekSelect,
}) => {
  const percentOfTotal = ((champion.total / totalAttendance) * 100).toFixed(2);

  // Find tournaments where this leader won
  const winningTournaments = useMemo(() => {
    const tournaments = [];

    // Go through each tournament group
    for (const group of tournamentGroups) {
      // Go through each tournament in the group
      for (const tournamentItem of group.tournaments) {
        // Check if this tournament has a deck with placement = 1 (winner)
        if (
          tournamentItem.tournamentDeck.placement === 1 &&
          tournamentItem.deck.leaderCardId1 === champion.leaderCardId
        ) {
          tournaments.push({
            tournament: tournamentItem.tournament,
            groupId: group.group.id,
            weekNumber: group.group.name.match(/^PQ Week (\d+)$/)?.[1] || '?',
          });
        }
      }
    }

    return tournaments;
  }, [champion.leaderCardId, tournamentGroups]);

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex justify-center">{label(champion.leaderCardId, 'leaders', 'text')}</div>

      <div className="text-xs space-y-1 mt-2">
        <table>
          <thead>
            <tr className="bg-accent font-bold">
              <td className="px-2 py-1">Statistic</td>
              <td className="px-2 py-1">Value</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="text-left px-2 bg-accent">Times Played</th>
              <td className="text-right px-2">
                {champion.total} / {totalAttendance} ({percentOfTotal}%)
              </td>
            </tr>
            <tr>
              <th className="text-left px-2 bg-accent">Times Won</th>
              <td className="text-right px-2">{champion.winner}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-center mt-2 text-muted-foreground">
          This leader won a PQ despite being played in only {champion.total} decks ({percentOfTotal}
          % of all {totalAttendance} decks).
        </p>

        {/* Display tournaments where this leader won */}
        {winningTournaments.length > 0 && (
          <div className="mt-4">
            <table className="w-full">
              <thead>
                <tr className="bg-accent">
                  <th className="py-1 px-2 text-left">Week</th>
                  <th className="py-1 px-2 text-left">Tournament</th>
                  <th className="py-1 px-2 text-right">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {winningTournaments.map(item => {
                  // Remove "PQ - " prefix from tournament name
                  const displayName = item.tournament.name.replace(/^PQ - /, '');
                  const countryCode = item.tournament.location as CountryCode;

                  return (
                    <tr
                      key={item.tournament.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-1 px-2">
                        <span
                          className="underline cursor-pointer"
                          onClick={() => handleWeekSelect(item.groupId)}
                        >
                          Week {item.weekNumber}
                        </span>
                      </td>
                      <td className="py-1">
                        <div className="flex items-center">
                          <Flag countryCode={countryCode} className="mr-2" />
                          <Link
                            to="/tournaments/$tournamentId"
                            params={{
                              tournamentId: item.tournament.id,
                            }}
                          >
                            {displayName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{item.tournament.attendance}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnusualChampionTooltip;
