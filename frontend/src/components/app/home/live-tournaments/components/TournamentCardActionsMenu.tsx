import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { TournamentWeekendResourceSubmissionDialog } from './TournamentWeekendResourceSubmissionDialog.tsx';

export function TournamentCardActionsMenu({
  meleeUrl,
  tournamentId,
  weekendId,
  weekendTournaments,
}: {
  meleeUrl: string | null;
  tournamentId: string;
  weekendId: string;
  weekendTournaments: LiveTournamentWeekendTournamentEntry[];
}) {
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const tournamentDetailUrl = `/tournaments/${tournamentId}`;
  const submitLabel = meleeUrl ? 'Submit stream or resource' : 'Submit melee ID';

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
