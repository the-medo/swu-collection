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
import { LiveBracketTopStandings } from './bracket-preview/LiveBracketTopStandings.tsx';
import DeckViewer from '@/components/app/tournaments/TournamentTopBracket/components/DeckViewer.tsx';

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
  const [highlightedPlayerDisplayName, setHighlightedPlayerDisplayName] = useState<string | null>(
    null,
  );
  const [selectedDeckId, setSelectedDeckId] = useState<string>();
  const bracketQuery = useLiveTournamentBracket(weekendId, tournamentId, open && hasBracketMatches);
  const rounds = bracketQuery.data?.data.rounds ?? [];
  const topStandings = bracketQuery.data?.data.topStandings ?? [];

  if (!hasBracketMatches) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setHighlightedPlayerDisplayName(null);
          setSelectedDeckId(undefined);
        }
      }}
    >
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
      <DialogContent className="flex max-h-[92vh] w-[min(98vw,1600px)] max-w-[98vw] flex-col overflow-x-hidden overflow-y-auto p-4 sm:p-6">
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
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 overflow-x-auto rounded-md border bg-card/60 p-3">
              {selectedDeckId ? (
                <DeckViewer
                  selectedDeckId={selectedDeckId}
                  setSelectedDeckId={setSelectedDeckId}
                  compact={true}
                />
              ) : rounds.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No bracket matches are available yet.
                </div>
              ) : (
                <LiveBracketRounds
                  rounds={rounds}
                  highlightedPlayerDisplayName={highlightedPlayerDisplayName}
                  selectedDeckId={selectedDeckId}
                  setHighlightedPlayerDisplayName={setHighlightedPlayerDisplayName}
                  setSelectedDeckId={setSelectedDeckId}
                />
              )}
            </div>
            <div className="min-w-0">
              <LiveBracketTopStandings
                topStandings={topStandings}
                rounds={rounds}
                highlightedPlayerDisplayName={highlightedPlayerDisplayName}
                selectedDeckId={selectedDeckId}
                setHighlightedPlayerDisplayName={setHighlightedPlayerDisplayName}
                setSelectedDeckId={setSelectedDeckId}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
