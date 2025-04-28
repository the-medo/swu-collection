import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Button } from '@/components/ui/button';
import { Database, Edit, Trash2, Trophy } from 'lucide-react';
import EditTournamentDialog from '@/components/app/dialogs/EditTournamentDialog.tsx';
import DeleteTournamentDialog from '@/components/app/dialogs/DeleteTournamentDialog.tsx';
import ImportMeleeTournamentDialog from '@/components/app/dialogs/ImportMeleeTournamentDialog.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { TournamentTabs } from '../TournamentTabs';

interface TournamentDetailProps {
  tournamentId: string;
  children?: React.ReactNode;
  activeTab?: string;
}

const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournamentId,
  children,
  activeTab,
}) => {
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

  return (
    <div className="space-y-2">
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

      {/* Tournament tabs */}
      <TournamentTabs tournamentId={tournamentId} activeTab={activeTab} />

      {/* Tab content */}
      {children}
    </div>
  );
};

export default TournamentDetail;
