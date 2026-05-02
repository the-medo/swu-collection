import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Button } from '@/components/ui/button';
import {
  Camera,
  ChartColumn,
  ChevronDown,
  Database,
  Edit,
  FileJson2,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
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
import { Helmet } from 'react-helmet-async';
import { useMemo, useState } from 'react';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import { usePutTournament } from '@/api/tournaments/usePutTournament.ts';
import type { TournamentTabsProps } from '@/components/app/tournaments/TournamentTabs/TournamentTabs.tsx';
import MeleeButton from '@/components/app/tournaments/TournamentDetail/MeleeButton.tsx';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { useGenerateTournamentScreenshots } from '@/api/tournaments/useGenerateTournamentScreenshots.ts';

interface TournamentDetailProps {
  tournamentId: string;
  children?: React.ReactNode;
  activeTab?: string;
  mode?: TournamentTabsProps['mode'];
  displayHeader?: boolean;
}

type AdminDialog = 'edit' | 'import-melee' | 'blob' | 'delete' | null;

const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournamentId,
  children,
  activeTab,
  mode = 'tournament-page',
  displayHeader = true,
}) => {
  const { data, isFetching, error } = useGetTournament(tournamentId);
  const hasPermission = usePermissions();
  const computeCardStats = useComputeCardStats();
  const toggleImportedMutation = usePutTournament(tournamentId);
  const generateScreenshots = useGenerateTournamentScreenshots(tournamentId);
  const [adminDialog, setAdminDialog] = useState<AdminDialog>(null);
  const loading = isFetching;
  const tournament = data?.tournament;

  const canUpdate = hasPermission('tournament', 'update');
  const canDelete = hasPermission('tournament', 'delete');
  const canImportTournament = hasPermission('tournament', 'import');
  const canComputeStats = hasPermission('statistics', 'compute');
  const canAccessAdmin = hasPermission('admin', 'access');
  const canRecomputeStats = canComputeStats && !!tournament?.imported;
  const showAdminTools = canRecomputeStats || canAccessAdmin;
  const showAdminMenu =
    canUpdate || canDelete || canImportTournament || canRecomputeStats || canAccessAdmin;

  const hiddenDialogTrigger = (
    <button type="button" className="hidden" tabIndex={-1} aria-hidden="true" />
  );

  const handleComputeStats = async () => {
    try {
      await computeCardStats.mutateAsync({ tournamentId });
      toast({
        title: 'Card statistics computed',
        description: 'Tournament card statistics have been recomputed successfully.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to compute tournament card statistics.',
        variant: 'destructive',
      });
    }
  };

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
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update tournament imported status.',
        variant: 'destructive',
      });
    }
  };

  const handleRunScreenshotter = () => {
    generateScreenshots.mutate({ force: true });
  };

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

  return (
    <>
      <Helmet titleTemplate={`%s - ${pageTitle}`} />
      <div className="space-y-2 w-full">
        {/* Tournament header */}
        {displayHeader && (
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <LoadingTitle mainTitle={tournament?.name} loading={loading} />

            {!loading && tournament && (
              <div className="flex flex-wrap gap-2">
                {tournament.meleeId && <MeleeButton meleeId={tournament.meleeId} />}

                {showAdminMenu && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" variant="outline">
                        <ShieldCheck className="h-4 w-4" />
                        Admin
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Tournament admin</DropdownMenuLabel>
                      {canUpdate && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => setAdminDialog('edit')}
                        >
                          <Edit className="h-4 w-4" />
                          Edit tournament
                        </DropdownMenuItem>
                      )}

                      {canUpdate && (
                        <DropdownMenuCheckboxItem
                          checked={tournament.imported}
                          disabled={toggleImportedMutation.isPending}
                          onCheckedChange={() => {
                            void handleToggleImported();
                          }}
                        >
                          Marked as imported
                        </DropdownMenuCheckboxItem>
                      )}

                      {canUpdate && (canImportTournament || showAdminTools || canDelete) && (
                        <DropdownMenuSeparator />
                      )}

                      {canImportTournament && (
                        <>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => setAdminDialog('import-melee')}
                          >
                            <Database className="h-4 w-4" />
                            Import from Melee.gg
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => setAdminDialog('blob')}
                          >
                            <FileJson2 className="h-4 w-4" />
                            Import/export blob
                          </DropdownMenuItem>
                        </>
                      )}

                      {canImportTournament && (showAdminTools || canDelete) && (
                        <DropdownMenuSeparator />
                      )}

                      {canRecomputeStats && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={computeCardStats.isPending}
                          onSelect={() => {
                            void handleComputeStats();
                          }}
                        >
                          {computeCardStats.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChartColumn className="h-4 w-4" />
                          )}
                          {computeCardStats.isPending
                            ? 'Computing card stats'
                            : 'Recompute card stats'}
                        </DropdownMenuItem>
                      )}

                      {canAccessAdmin && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={!tournament.imported || generateScreenshots.isPending}
                          title={
                            tournament.imported
                              ? undefined
                              : 'Import tournament data before running the screenshotter'
                          }
                          onSelect={handleRunScreenshotter}
                        >
                          {generateScreenshots.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                          {generateScreenshots.isPending
                            ? 'Running screenshotter'
                            : 'Run screenshotter'}
                        </DropdownMenuItem>
                      )}

                      {showAdminTools && canDelete && <DropdownMenuSeparator />}

                      {canDelete && (
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onSelect={() => setAdminDialog('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete tournament
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {canUpdate && (
                  <EditTournamentDialog
                    trigger={hiddenDialogTrigger}
                    tournament={tournament}
                    open={adminDialog === 'edit'}
                    onOpenChange={open => setAdminDialog(open ? 'edit' : null)}
                  />
                )}

                {canImportTournament && (
                  <ImportMeleeTournamentDialog
                    trigger={hiddenDialogTrigger}
                    tournamentId={tournamentId}
                    meleeId={tournament.meleeId}
                    open={adminDialog === 'import-melee'}
                    onOpenChange={open => setAdminDialog(open ? 'import-melee' : null)}
                  />
                )}

                {canImportTournament && (
                  <ImportExportTournamentBlobDialog
                    trigger={hiddenDialogTrigger}
                    tournamentId={tournamentId}
                    open={adminDialog === 'blob'}
                    onOpenChange={open => setAdminDialog(open ? 'blob' : null)}
                  />
                )}

                {canDelete && (
                  <DeleteTournamentDialog
                    trigger={hiddenDialogTrigger}
                    tournament={tournament}
                    open={adminDialog === 'delete'}
                    onOpenChange={open => setAdminDialog(open ? 'delete' : null)}
                  />
                )}
              </div>
            )}
          </div>
        )}
        <TournamentDataLoader tournamentId={tournamentId} />
        <TournamentTabs tournamentId={tournamentId} activeTab={activeTab} mode={mode} />
        {activeTab === 'details' || tournament?.imported ? children : null}
        <NoTournamentData tournamentId={tournamentId} />
      </div>
    </>
  );
};

export default TournamentDetail;
