import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import { CalendarIcon, MapPinIcon, Users, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/locale.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import TournamentTopBracket from '../TournamentTopBracket/TournamentTopBracket.tsx';
import { Helmet } from 'react-helmet-async';
import { BracketInfo } from '../../../../../../types/enums.ts';

interface DetailAndBracketTabProps {
  tournamentId: string;
}

const DetailAndBracketTab: React.FC<DetailAndBracketTabProps> = ({ tournamentId }) => {
  const { data, isFetching } = useGetTournament(tournamentId);

  const loading = isFetching;
  const tournament = data?.tournament;
  const tournamentType = data?.tournamentType;
  const meta = data?.meta;

  return (
    <>
      <Helmet title="Details" />
      <div className="space-y-6">
        {/* Tournament info */}
        {!loading && tournament && (
          <div className="grid grid-cols-1 gap-4">
            {/* Tournament Info Table */}
            <div className="bg-card rounded-md border shadow-xs p-3">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1.5 pr-2 w-32">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {formatDate(tournament.date)}
                      {tournament.days > 1 && (
                        <span className="ml-2 text-muted-foreground">({tournament.days} days)</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 w-32">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Format:</span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {formatDataById[tournament.format]?.name || 'Unknown'}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Location:</span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {tournament.location}
                      <span className="ml-2 text-muted-foreground">({tournament.continent})</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Set:</span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {meta ? (
                        <>
                          {meta.set.toUpperCase()}
                          <span className="ml-2 text-muted-foreground">Season {meta.season}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No meta data available</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Attendance:</span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {tournament.attendance} players
                      {tournament.days > 1 && (
                        <span className="ml-2 text-muted-foreground">
                          ({tournament.dayTwoPlayerCount} day two)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {meta && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Meta Name:</span>
                        </div>
                      )}
                    </td>
                    <td className="py-1.5">{meta?.name}</td>
                  </tr>

                  <tr>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        <Trophy className={`h-4 w-4 text-muted-foreground`} />
                        <span className="font-medium">Type:</span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {tournamentType?.name || tournament.type}
                      {tournamentType?.major === 1 && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-full">
                          Major
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2"></td>
                    <td className="py-1.5"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tournament Bracket */}
            <TournamentTopBracket
              tournamentId={tournamentId}
              top={(tournament.bracketInfo ?? BracketInfo.NONE) as BracketInfo}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default DetailAndBracketTab;
