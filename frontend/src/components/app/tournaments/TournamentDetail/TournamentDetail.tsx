import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, Trophy, Users, Database, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/locale.ts';
import EditTournamentDialog from '@/components/app/dialogs/EditTournamentDialog.tsx';
import DeleteTournamentDialog from '@/components/app/dialogs/DeleteTournamentDialog.tsx';
import ImportMeleeTournamentDialog from '@/components/app/dialogs/ImportMeleeTournamentDialog.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { useTournamentPermissions } from '@/hooks/useTournamentPermissions.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import { tournamentTypesInfo } from '../../../../../../types/Tournament.ts';

interface TournamentDetailProps {
  tournamentId: string;
}

const TournamentDetail: React.FC<TournamentDetailProps> = ({ tournamentId }) => {
  const { data, isFetching, error } = useGetTournament(tournamentId);
  const { canUpdate, canDelete } = useTournamentPermissions();

  // Handle 404 error
  if (error?.status === 404) {
    return (
      <Error404
        title="Tournament not found"
        description="The tournament you are looking for does not exist or has been deleted."
      />
    );
  }

  const loading = isFetching;
  const tournament = data?.tournament;
  const tournamentType = data?.tournamentType;
  const user = data?.user;

  return (
    <div className="space-y-6">
      {/* Tournament header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <LoadingTitle
          mainTitle={tournament?.name}
          subTitle={
            user ? (
              <>
                created by{' '}
                <Link to={`/users/$userId`} params={{ userId: user.id }}>
                  {user.displayName}
                </Link>
              </>
            ) : undefined
          }
          loading={loading}
        />

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

            {tournament.meleeId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`https://melee.gg/tournament/${tournament.meleeId}`, '_blank')
                }
              >
                <Trophy className="h-4 w-4 mr-2" />
                View on Melee.gg
              </Button>
            ) : (
              canUpdate && (
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
              )
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="font-medium">Date:</span>
              <span>{formatDate(tournament.date)}</span>
              {tournament.days > 1 && <span>({tournament.days} days)</span>}
            </div>

            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              <span className="font-medium">Location:</span>
              <span>{tournament.location}</span>
              <span className="text-muted-foreground">({tournament.continent})</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Attendance:</span>
              <span>{tournament.attendance} players</span>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {tournamentType && (
              <div className="flex items-center gap-2">
                <Trophy
                  className={`h-4 w-4 ${tournamentTypesInfo[tournamentType.id]?.major === 1 ? 'text-amber-500' : ''}`}
                />
                <span className="font-medium">Type:</span>
                <span>
                  {tournamentType?.name ||
                    tournamentTypesInfo[tournamentType.id]?.name ||
                    tournament.type}
                </span>
                {tournamentTypesInfo[tournamentType.id]?.major === 1 && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-full ml-2">
                    Major
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-medium">Format:</span>
              <span>{formatDataById[tournament.format]?.name || 'Unknown'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Set:</span>
              <span>{tournament.set.toUpperCase()}</span>
              <span className="text-muted-foreground">Season {tournament.season}</span>
            </div>

            {tournament.metaShakeup && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Meta Shakeup:</span>
                <span>{tournament.metaShakeup}</span>
              </div>
            )}
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
