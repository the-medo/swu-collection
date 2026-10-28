import { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useGetTournamentDecks } from '@/api/tournaments/useGetTournamentDecks';
import { useGetTournamentMatches } from '@/api/tournaments/useGetTournamentMatches';
import { useGetTournament } from '@/api/tournaments/useGetTournament';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { cn } from '@/lib/utils';
import { BracketInfo } from '../../../../../../types/enums.ts';
import { isLimitedFormat } from '../../../../../../types/Format';
import { bracketSize, buildBracket } from './bracketModel';
import BracketRounds from './components/BracketRounds';
import TournamentPlacements from './components/TournamentPlacements';
import DeckViewer from './components/DeckViewer';
import { TournamentNoBracket } from './components/TournamentNoBracket';

interface TournamentTopBracketProps {
  tournamentId: string;
  top?: BracketInfo;
  className?: string;
  compact?: boolean;
}
export default function TournamentTopBracket({
  tournamentId,
  top = BracketInfo.TOP8,
  compact,
  className,
}: TournamentTopBracketProps) {
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusKey = useRef<string | null>(null);
  const decksQuery = useGetTournamentDecks(tournamentId);
  const matchesQuery = useGetTournamentMatches(tournamentId);
  const { data: tournamentData } = useGetTournament(tournamentId);
  const limited = isLimitedFormat(tournamentData?.tournament.format ?? 0);
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>();
  const [contentMinHeight, setContentMinHeight] = useState<number>();
  const topDecks = useMemo(
    () =>
      (decksQuery.data?.data ?? [])
        .filter(
          d =>
            d.tournamentDeck.placement !== null &&
            d.tournamentDeck.placement > 0 &&
            d.tournamentDeck.placement <= bracketSize[top],
        )
        .sort((a, b) => a.tournamentDeck.placement! - b.tournamentDeck.placement!),
    [decksQuery.data, top],
  );
  const bracket = useMemo(
    () => buildBracket(matchesQuery.data?.data ?? [], decksQuery.data?.data ?? [], top, limited),
    [matchesQuery.data, decksQuery.data, top, limited],
  );
  const hasBracket = bracket.some(round => round.length);
  const champion = topDecks.find(deck => deck.tournamentDeck.placement === 1);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (selectedDeckId) {
      const back = panel.querySelector<HTMLButtonElement>('[data-deck-back]');
      back?.focus({ preventScroll: true });
    } else if (returnFocusKey.current) {
      const trigger = [
        ...panel.querySelectorAll<HTMLButtonElement>('[data-bracket-deck-trigger]'),
      ].find(button => button.dataset.bracketDeckTrigger === returnFocusKey.current);
      trigger?.focus({ preventScroll: true });
      returnFocusKey.current = null;
    }
  }, [selectedDeckId]);

  const selectDeck = (deckId: string | undefined) => {
    // Keep the tallest viewed content height until Back so loading or switching cannot pull the page up.
    if (deckId) setContentMinHeight(contentRef.current?.getBoundingClientRect().height);
    if (deckId)
      returnFocusKey.current =
        document.activeElement?.getAttribute('data-bracket-deck-trigger') ?? null;
    setHighlightedPlayer(null);
    setSelectedDeckId(deckId);
  };
  const interaction = { highlightedPlayer, setHighlightedPlayer, setSelectedDeckId: selectDeck };

  if (decksQuery.isLoading || matchesQuery.isLoading)
    return (
      <div className="rounded-xl border p-5" role="status">
        <span className="sr-only">Loading tournament results…</span>
        <Skeleton className="mb-4 h-10 w-60" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (decksQuery.isError)
    return (
      <div role="alert" className="rounded-xl border p-6 text-sm">
        Unable to load tournament standings.{' '}
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={() => void decksQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  if (!topDecks.length && !hasBracket && !matchesQuery.isError) {
    if (limited) return null;
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Final standings are not available yet.
      </div>
    );
  }

  return (
    <section
      ref={panelRef}
      className={cn(workspaceStyles.panel, '@container/bracket p-4 @xl:p-5', className)}
      data-screenshot-target="tournament-bracket"
      data-tournament-id={tournamentId}
      aria-label="Tournament results"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          className={cn(
            workspaceStyles.heading,
            'flex items-center gap-2 text-[length:0.6875rem]! uppercase tracking-[0.14em]! text-muted-foreground',
          )}
        >
          <Trophy className="size-3.5 text-primary" /> Tournament results{' '}
          {top !== BracketInfo.NONE && (
            <span className="rounded border px-1.5 py-0.5 tracking-normal">
              Top {bracketSize[top]}
            </span>
          )}
        </h2>
        {champion && top !== BracketInfo.NONE && (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            <Trophy className="size-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">Champion</span>
            <span
              className="truncate font-semibold"
              title={champion.tournamentDeck.meleePlayerUsername ?? undefined}
            >
              {champion.tournamentDeck.meleePlayerUsername ?? 'Unknown player'}
            </span>
          </div>
        )}
      </div>
      <div
        className={cn(
          'grid items-start gap-4',
          topDecks.length > 0 && '@[900px]/bracket:grid-cols-[276px_minmax(0,1fr)]',
        )}
      >
        {topDecks.length > 0 && (
          <TournamentPlacements
            hasTopCut={top !== BracketInfo.NONE}
            topDecks={topDecks}
            selectedDeckId={selectedDeckId}
            {...interaction}
          />
        )}
        <div
          ref={contentRef}
          className="min-w-0"
          style={{ minHeight: selectedDeckId ? contentMinHeight : undefined }}
        >
          {selectedDeckId ? (
            <DeckViewer
              backLabel="Back to tournament results"
              selectedDeckId={selectedDeckId}
              setSelectedDeckId={selectDeck}
              compact={compact}
            />
          ) : top === BracketInfo.NONE ? (
            <TournamentNoBracket tournamentId={tournamentId} />
          ) : matchesQuery.isError ? (
            <div role="alert" className="rounded-xl border p-6 text-sm">
              Unable to load match results.{' '}
              <Button
                size="sm"
                variant="outline"
                className="ml-2"
                onClick={() => void matchesQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : hasBracket ? (
            <BracketRounds bracket={bracket} {...interaction} />
          ) : (
            <p className="rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              Match results are not available. You can still explore the final standings.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
