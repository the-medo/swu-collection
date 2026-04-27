import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useUpdateTournamentWeekendTournament } from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { useRole } from '@/hooks/useRole.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { TournamentWeekendResourceSubmissionDialog } from './TournamentWeekendResourceSubmissionDialog.tsx';

export function TournamentCardActionsMenu({
  meleeUrl,
  isLiveCheckEnabled,
  tournamentId,
  tournamentName,
  weekendId,
  weekendTournaments,
}: {
  meleeUrl: string | null;
  isLiveCheckEnabled: boolean;
  tournamentId: string;
  tournamentName: string;
  weekendId: string;
  weekendTournaments: LiveTournamentWeekendTournamentEntry[];
}) {
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const hasRole = useRole();
  const isAdmin = hasRole('admin');
  const updateTournament = useUpdateTournamentWeekendTournament(weekendId);
  const tournamentDetailUrl = `/tournaments/${tournamentId}`;
  const submitLabel = meleeUrl ? 'Submit stream or resource' : 'Submit melee ID';

  const toggleLiveChecks = async (nextIsLiveCheckEnabled: boolean) => {
    try {
      await updateTournament.mutateAsync({
        tournamentId,
        data: { isLiveCheckEnabled: nextIsLiveCheckEnabled },
      });
      toast({
        title: nextIsLiveCheckEnabled ? 'Live checks enabled' : 'Live checks disabled',
        description: `"${tournamentName}" was updated.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update live checks',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="iconSmall"
            className="h-7 w-7 rounded-md"
            aria-label="Tournament actions"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {meleeUrl ? (
            <DropdownMenuItem asChild>
              <a href={meleeUrl} target="_blank" rel="noreferrer">
                Open melee
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>Open melee</DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={tournamentDetailUrl}>Open tournament detail</a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSubmissionDialogOpen(true)}>
            {submitLabel}
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={isLiveCheckEnabled}
                disabled={updateTournament.isPending}
                onCheckedChange={toggleLiveChecks}
              >
                Live checks {isLiveCheckEnabled ? 'enabled' : 'disabled'}
              </DropdownMenuCheckboxItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TournamentWeekendResourceSubmissionDialog
        open={submissionDialogOpen}
        onOpenChange={setSubmissionDialogOpen}
        weekendId={weekendId}
        tournaments={weekendTournaments}
        preselectedTournamentId={tournamentId}
      />
    </>
  );
}
