import { useState } from 'react';
import { GitFork, Loader2 } from 'lucide-react';
import { useLiveTournamentBracket } from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { LiveBracketRounds } from './bracket-preview/LiveBracketRounds.tsx';

export function BracketPreview({
  weekendId,
  tournamentId,
  hasBracketMatches,
}: {
  weekendId: string;
  tournamentId: string;
  hasBracketMatches: boolean;
}) {
  const [open, setOpen] = useState(false);
  const bracketQuery = useLiveTournamentBracket(weekendId, tournamentId, open && hasBracketMatches);
  const rounds = bracketQuery.data?.data.rounds ?? [];

  if (!hasBracketMatches) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 justify-start px-2 text-xs font-medium uppercase text-muted-foreground"
        >
          <GitFork className="rotate-270" />
          Top 8 bracket
        </Button>
      </DialogTrigger>
      <DialogContent className=" max-w-[96vw] w-[1200px] p-4 sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>Top 8 bracket</DialogTitle>
        </DialogHeader>
        {bracketQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bracket...
          </div>
        ) : bracketQuery.isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {bracketQuery.error?.message ?? 'Failed to load bracket.'}
          </div>
        ) : rounds.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No bracket matches are available yet.
          </div>
        ) : (
          <div className="max-h-[85vh] overflow-x-auto overflow-y-auto pb-1 scale-70 -m-[10%] xl:scale-80 xl:-m-[7%] 2xl:scale-90 2xl:-m-[4%]">
            <LiveBracketRounds rounds={rounds} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
