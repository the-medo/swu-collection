import { Check, Loader2, RefreshCcw } from 'lucide-react';
import {
  tournamentWeekendQueryKeys,
  useCheckTournamentWeekend,
  useRefreshTournamentWeekendTournaments,
} from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import { toast } from '@/hooks/use-toast.ts';
import { cn } from '@/lib/utils.ts';
import { queryClient } from '@/queryClient.ts';
import type { TournamentWeekend } from '../../../../../../server/db/schema/tournament_weekend.ts';
import type { TournamentWeekendCheckResponse } from '../../../../../../types/TournamentWeekend.ts';

export function TournamentWeekendActions({
  weekend,
  checkData,
  onCheckData,
}: {
  weekend: TournamentWeekend;
  checkData?: TournamentWeekendCheckResponse;
  onCheckData: (data: TournamentWeekendCheckResponse | undefined) => void;
}) {
  const refreshTournaments = useRefreshTournamentWeekendTournaments(weekend.id);
  const checkWeekend = useCheckTournamentWeekend(weekend.id);

  const refresh = async () => {
    try {
      const result = await refreshTournaments.mutateAsync();
      queryClient.invalidateQueries({ queryKey: tournamentWeekendQueryKeys.detail(weekend.id) });
      toast({
        title: 'Weekend tournaments refreshed',
        description: `${result.data.sync?.inserted ?? 0} added, ${result.data.sync?.deleted ?? 0} removed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to refresh tournaments',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const check = async () => {
    try {
      const result = await checkWeekend.mutateAsync();
      onCheckData(result);
      toast({
        title: 'Live checks completed',
        description: `${result.data.results.length} checked, ${result.data.errors.length} errors.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to run checks',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Maintenance</h3>
          <p className="text-xs text-muted-foreground">
            Sync weekend membership or run Melee live checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh} disabled={refreshTournaments.isPending}>
            <RefreshCcw
              className={cn('mr-2 h-4 w-4', refreshTournaments.isPending && 'animate-spin')}
            />
            Reconcile tournaments
          </Button>
          <Button onClick={check} disabled={checkWeekend.isPending}>
            {checkWeekend.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Run live checks
          </Button>
        </div>
      </div>

      {checkData && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="font-medium">Last check result</div>
          <div className="mt-1 text-muted-foreground">
            {checkData.data.eligibleTournamentCount} eligible tournaments,{' '}
            {checkData.data.results.length} completed, {checkData.data.errors.length} errors.
          </div>
          {checkData.data.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-destructive">
              {checkData.data.errors.map(error => (
                <li key={error.tournamentId}>
                  {error.meleeId ?? error.tournamentId}: {error.error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
