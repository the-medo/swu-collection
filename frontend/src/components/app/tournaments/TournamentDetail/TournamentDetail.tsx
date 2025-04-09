import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, Users, Trophy, Database, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/locale.ts';
import EditTournamentDialog from '@/components/app/dialogs/EditTournamentDialog.tsx';
import DeleteTournamentDialog from '@/components/app/dialogs/DeleteTournamentDialog.tsx';
import ImportMeleeTournamentDialog from '@/components/app/dialogs/ImportMeleeTournamentDialog.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import TournamentTopBracket from '../TournamentTopBracket/TournamentTopBracket.tsx';

interface TournamentDetailProps {
  tournamentId: string;
}

const TournamentDetail: React.FC<TournamentDetailProps> = ({ tournamentId }) => {
  const { data, isFetching, error } = useGetTournament(tournamentId);
  const hasPermission = usePermissions();

  // Handle 404 error
  if (error?.status === 404) {
    return (
      <Error404
        title="Tournament not found"
        description="The tournament you are looking for does not exist or has been deleted."
      />
    );
  }

  const canUpdate = hasPermission('tournament', 'update');
  const canDelete = hasPermission('tournament', 'delete');

  const loading = isFetching;
  const tournament = data?.tournament;
  const tournamentType = data?.tournamentType;

  return (
    <div className="space-y-6">
      {/* Tournament header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <LoadingTitle mainTitle={tournament?.name} loading={loading} />

        {!loading && tournament && (
          <div className="flex flex-wrap gap-2">
            {canUpdate && (
              <EditTournamentDialog
                trigger={
                  <Button size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                }
                tournament={tournament}
              />
            )}

            {tournament.meleeId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`https://melee.gg/Tournament/View/${tournament.meleeId}`, '_blank')
                }
              >
                <Trophy className="h-4 w-4 mr-2" />
                View on Melee.gg
              </Button>
            )}
            {canUpdate && (
              <ImportMeleeTournamentDialog
                trigger={
                  <Button size="sm" variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Import from Melee.gg
                  </Button>
                }
                tournamentId={tournamentId}
                meleeId={tournament.meleeId}
              />
            )}

            {canDelete && (
              <DeleteTournamentDialog
                trigger={
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                }
                tournament={tournament}
              />
            )}
          </div>
        )}
      </div>

      {/* Tournament info */}
      {!loading && tournament && (
        <div className="grid grid-cols-1 gap-4">
          {/* Tournament Info Table */}
          <div className="bg-card rounded-md border shadow-sm p-3">
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
                  <td className="py-1.5">{formatDataById[tournament.format]?.name || 'Unknown'}</td>
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
                    {tournament.set.toUpperCase()}
                    <span className="ml-2 text-muted-foreground">Season {tournament.season}</span>
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
                    {tournament.metaShakeup && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Meta Shakeup:</span>
                      </div>
                    )}
                  </td>
                  <td className="py-1.5">{tournament.metaShakeup}</td>
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
          <div className="bg-card rounded-md border shadow-sm p-3">
            <TournamentTopBracket tournamentId={tournamentId} top={8} />
          </div>
        </div>
      )}

      {/* Tournament results section - This will be implemented later */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Top Decks</h3>
        <div className="bg-muted p-8 rounded-md text-center">
          <p className="text-muted-foreground">Tournament deck results will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetail;
