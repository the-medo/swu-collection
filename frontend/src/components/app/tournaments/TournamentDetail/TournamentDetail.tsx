import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Button } from '@/components/ui/button';
import { Database, Edit, Trash2, Trophy, ChartColumn, Check, FileJson2 } from 'lucide-react';
import EditTournamentDialog from '@/components/app/dialogs/EditTournamentDialog.tsx';
import DeleteTournamentDialog from '@/components/app/dialogs/DeleteTournamentDialog.tsx';
import ImportMeleeTournamentDialog from '@/components/app/dialogs/ImportMeleeTournamentDialog.tsx';
import ImportExportTournamentBlobDialog from '@/components/app/dialogs/ImportExportTournamentBlobDialog.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { TournamentTabs } from '../TournamentTabs';
import NoTournamentData from '@/components/app/tournaments/components/NoTournamentData.tsx';
import { useComputeCardStats } from '@/api/card-stats/useComputeCardStats.ts';
import { toast } from '@/hooks/use-toast.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import { usePutTournament } from '@/api/tournaments/usePutTournament.ts';

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
  const computeCardStats = useComputeCardStats();

  // Handle 404 error
  if (error?.status === 404) {
    return (
      <>
        <Helmet title="Tournament not found | SWUBase" />
        <Error404
          title="Tournament not found"
          description="The tournament you are looking for does not exist or has been deleted."
        />
      </>
    );
  }

  const canUpdate = hasPermission('tournament', 'update');
  const canDelete = hasPermission('tournament', 'delete');
  const canComputeStats = hasPermission('statistics', 'compute');

  const handleComputeStats = async () => {
    try {
      await computeCardStats.mutateAsync({ tournamentId });
      toast({
        title: 'Card statistics computed',
        description: 'Tournament card statistics have been recomputed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to compute tournament card statistics.',
        variant: 'destructive',
      });
    }
  };

  const toggleImportedMutation = usePutTournament(tournamentId);

  const handleToggleImported = async () => {
    try {
      await toggleImportedMutation.mutateAsync({
        imported: !tournament?.imported,
      });
      toast({
        title: tournament?.imported
          ? 'Tournament marked as not imported'
          : 'Tournament marked as imported',
        description: `Tournament "${tournament?.name}" has been ${tournament?.imported ? 'unmarked' : 'marked'} as imported.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tournament imported status.',
        variant: 'destructive',
      });
    }
  };

  const loading = isFetching;
  const tournament = data?.tournament;

  // Generate title based on active tab
  const pageTitle = useMemo(() => {
    if (!tournament?.name) return 'Loading Tournament | SWUBase';

    let tabTitle = '';
    switch (activeTab) {
      case 'details':
        tabTitle = 'Details';
        break;
      case 'decks':
        tabTitle = 'Decks';
        break;
      case 'matchups':
        tabTitle = 'Matchups';
        break;
      case 'card-stats':
        tabTitle = 'Card Stats';
        break;
      case 'meta':
        tabTitle = 'Meta Analysis';
        break;
      default:
        tabTitle = '';
    }

    return tabTitle ? `${tournament.name} - ${tabTitle} | SWUBase` : `${tournament.name} | SWUBase`;
  }, [activeTab, tournament?.name]);

  return (
    <>
      <Helmet titleTemplate={`%s - ${pageTitle}`} />
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

              {canUpdate && (
                <ImportExportTournamentBlobDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <FileJson2 className="h-4 w-4" />
                    </Button>
                  }
                  tournamentId={tournamentId}
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

              {canComputeStats && tournament.imported && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleComputeStats}
                        disabled={computeCardStats.isPending}
                      >
                        <ChartColumn className="h-4 w-4" />
                        {computeCardStats.isPending ? 'Computing...' : 'Recompute Card Stats'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Recompute card statistics for this tournament</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {canUpdate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleImported}
                        disabled={toggleImportedMutation.isPending}
                      >
                        <Check
                          className={`h-4 w-4 ${tournament.imported ? 'text-green-500' : ''}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tournament.imported ? 'Mark as not imported' : 'Mark as imported'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
        <TournamentDataLoader tournamentId={tournamentId} />
        <TournamentTabs tournamentId={tournamentId} activeTab={activeTab} />
        {activeTab === 'details' || tournament?.imported ? children : null}
        <NoTournamentData tournamentId={tournamentId} />
      </div>
    </>
  );
};

export default TournamentDetail;
