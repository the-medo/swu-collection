import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { Button } from '@/components/ui/button.tsx';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';
import { statisticsStyles as styles } from '../statisticsStyles.ts';
import { useGameResultsContext } from '../GameResultsContext.tsx';
import HistoryOverview from './HistoryOverview.tsx';
import HistoryMatchDetails from './HistoryMatchDetails.tsx';
import HistoryMatchRow from './HistoryMatchRow.tsx';

// Match the CSS column breakpoint; JS only decides whether selection owns a modal.
const wideQuery = '(min-width: 1280px)';
const subscribeToWidth = (onChange: () => void) => {
  const media = window.matchMedia(wideQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getWideSnapshot = () => window.matchMedia(wideQuery).matches;

export default function StatisticsHistory({ teamId }: { teamId?: string }) {
  return <HistoryContent key={teamId ?? 'personal'} />;
}

function HistoryContent() {
  const data = useGameResultsContext();
  const { data: cards } = useCardList();
  const allMatches = useMemo(() => data?.matches.array ?? [], [data?.matches.array]);
  const [opponentFilter, setOpponentFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isWide = useSyncExternalStore(subscribeToWidth, getWideSnapshot, () => false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const insightRef = useRef<HTMLElement>(null);
  const matches = useMemo(
    () =>
      opponentFilter === null
        ? allMatches
        : allMatches.filter(match => (match.opponentLeaderCardId ?? '') === opponentFilter),
    [allMatches, opponentFilter],
  );
  const selected = matches.find(match => match.id === selectedId);
  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: matches.length,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  if (selectedId && !selected) setSelectedId(null);
  const selectedMatchId = selected?.id;

  useEffect(() => {
    if (isWide) {
      insightRef.current?.scrollTo({ top: 0 });
      if (selectedMatchId) backRef.current?.focus({ preventScroll: true });
    }
  }, [selectedMatchId, isWide]);

  const selectMatch = (id: string, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setSelectedId(id);
  };
  const restoreFocus = (matchId = selectedId) => {
    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus({ preventScroll: true });
      return;
    }
    const resultButton = [
      ...document.querySelectorAll<HTMLButtonElement>('[data-history-result-id]'),
    ].find(button => button.dataset.historyResultId === matchId);
    (resultButton ?? document.getElementById('statistics-history-list'))?.focus({
      preventScroll: true,
    });
  };
  const resetSelection = () => {
    setSelectedId(null);
    // Restore the form-strip button after the overview remounts.
    requestAnimationFrame(() => restoreFocus(selectedId));
  };
  const overview = (
    <HistoryOverview
      isLoading={data?.isLoading ?? false}
      isError={data?.isError ?? false}
      matches={matches}
      allMatches={allMatches}
      opponentFilter={opponentFilter}
      onOpponent={setOpponentFilter}
      onSelect={selectMatch}
    />
  );

  return (
    <>
      {data?.isLoading && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Loading game history…
        </p>
      )}
      {data?.isError && (
        <div role="alert" className="mb-3 flex items-center gap-2 text-sm">
          Could not refresh game history.
          <Button variant="outline" size="sm" onClick={data.refetch}>
            Retry
          </Button>
        </div>
      )}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)]">
        <section
          id="statistics-history-list"
          tabIndex={-1}
          className="order-2 min-w-0 scroll-mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:order-1"
          aria-label="Match history"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{matches.length} match records</span>
            <span>Select a match for details</span>
            {opponentFilter !== null && (
              <Button
                variant="secondary"
                size="xs"
                className="max-w-full"
                onClick={() => setOpponentFilter(null)}
              >
                <span className="truncate">
                  Against {cards?.cards[opponentFilter]?.name ?? 'Unknown leader'}
                </span>
                <X className="size-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">Clear opponent filter</span>
              </Button>
            )}
          </div>
          <div className={styles.ledger}>
            {!data?.isLoading && !matches.length && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {data?.isError
                  ? 'History is currently unavailable.'
                  : 'No matches found for these filters.'}
              </p>
            )}
            {matches.slice(0, itemsToShow).map(match => (
              <HistoryMatchRow
                key={match.id}
                match={match}
                selected={selected?.id === match.id}
                inSheet={!isWide}
                onSelect={selectMatch}
              />
            ))}
            <div ref={observerTarget} className="h-2" />
          </div>
        </section>
        <aside
          ref={insightRef}
          className={cn(
            styles.ledger,
            'order-1 min-w-0 xl:sticky xl:top-4 xl:order-2 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto',
          )}
          aria-label="History insights"
        >
          {isWide ? (
            selected ? (
              <>
                <div className="p-3">
                  <Button ref={backRef} variant="ghost" size="sm" onClick={resetSelection}>
                    <ArrowLeft size={14} aria-hidden="true" />
                    Back to overview
                  </Button>
                </div>
                <HistoryMatchDetails match={selected} />
              </>
            ) : (
              overview
            )
          ) : (
            <details className="group/history-overview">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                Recent form & opponents
                <ChevronDown
                  size={16}
                  className="transition-transform group-open/history-overview:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              {overview}
            </details>
          )}
        </aside>
      </div>
      <Sheet
        open={!isWide && !!selected}
        onOpenChange={open => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="bottom"
          className={cn(
            workspaceStyles.theme,
            styles.page,
            'max-h-[90dvh] overflow-y-auto rounded-t-xl p-0',
          )}
          aria-labelledby="statistics-match-sheet-title"
          aria-describedby="statistics-match-sheet-description"
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (isWide) backRef.current?.focus({ preventScroll: true });
            else if (triggerRef.current?.isConnected)
              triggerRef.current.focus({ preventScroll: true });
            else document.getElementById('statistics-history-list')?.focus({ preventScroll: true });
          }}
        >
          <div className="p-4 pr-12">
            <SheetTitle id="statistics-match-sheet-title" className={workspaceStyles.heading}>
              Match details
            </SheetTitle>
            <SheetDescription id="statistics-match-sheet-description" className="sr-only">
              Game-by-game results and recorded match information.
            </SheetDescription>
          </div>
          {selected && <HistoryMatchDetails match={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
