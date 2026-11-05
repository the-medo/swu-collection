import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import {
  useSelectedDeckKey,
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import {
  ArrowRight,
  ChartNoAxesCombined,
  ChevronDown,
  ExternalLink,
  Layers,
  Scale,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Route as TournamentDeckCardStatsRoute } from '@/routes/tournaments/$tournamentId/card-stats.tsx';
import { Route as TournamentDeckMetaRoute } from '@/routes/tournaments/$tournamentId/meta.tsx';
import { Route as TournamentDeckMatchupsRoute } from '@/routes/tournaments/$tournamentId/matchups.tsx';
import { Route as MetaRoute } from '@/routes/meta';
import { Route as PlanetaryQualifiersRoute } from '@/routes/tournaments/planetary-qualifiers';
import { Route as RootRoute } from '@/routes';
import {
  getDeckKeys,
  type TournamentDeckKey,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { competitionStyles } from '../competitionStyles.ts';
import { cn } from '@/lib/utils.ts';
import { useChartColorsAndGradients } from '../TournamentMeta/useChartColorsAndGradients.tsx';
import type { MetaInfo } from '../TournamentMeta/MetaInfoSelector.tsx';
import TournamentDeckGroupIdentity from './TournamentDeckGroupIdentity.tsx';

export type TournamentDeckKeyFloaterRoutes =
  | typeof TournamentDeckCardStatsRoute
  | typeof TournamentDeckMatchupsRoute
  | typeof TournamentDeckMetaRoute
  | typeof MetaRoute
  | typeof RootRoute
  | typeof PlanetaryQualifiersRoute;

interface TournamentDeckKeyFloaterProps {
  route: TournamentDeckKeyFloaterRoutes;
}

const comparisonPresets = [
  { id: 'best5', label: 'Best 5', limit: 5 },
  { id: 'best10', label: 'Best 10', limit: 10 },
  { id: 'top8', label: 'Top 8', limit: 10, placement: 8 },
  { id: 'top16', label: 'Top 16', limit: 10, placement: 16 },
] as const;

function DeckGroupActions({
  route,
  groupKey,
  metaInfo,
  focusRequest,
}: TournamentDeckKeyFloaterProps & {
  groupKey: string;
  metaInfo: MetaInfo;
  focusRequest?: TournamentDeckKey;
}) {
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const { decks, isLoaded } = useTournamentMetaStore();
  const { data: cardListData } = useCardList();
  const { clearComparerEntries, addComparerEntry } = useComparerStoreActions();
  const navigate = useNavigate({ from: route.fullPath });
  const { tournamentId } = useParams({ strict: false });
  const gradient = useChartColorsAndGradients();
  const [preset, setPreset] = useState('best5');
  const [comparisonExpanded, setComparisonExpanded] = useState(false);
  const comparisonId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | SVGElement | null>(null);

  useEffect(() => {
    if (!focusRequest) return;
    const trigger = document.activeElement;
    if (trigger instanceof HTMLElement || trigger instanceof SVGElement)
      triggerRef.current = trigger;
    panelRef.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  useEffect(() => {
    // The redesigned comparison controls no longer have a persisted disclosure.
    try {
      localStorage.removeItem('comparer-accordion-state');
    } catch {
      // The panel also works when browser storage is unavailable.
    }
  }, []);

  const close = () => {
    setTournamentDeckKey({});
    if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
  };

  const matchingDecks = useMemo(
    () =>
      cardListData
        ? decks.filter(deck => getDeckKeys(deck, metaInfo, cardListData).includes(groupKey))
        : [],
    [decks, cardListData, metaInfo, groupKey],
  );
  // A deck can appear at several events. Compare distinct lists, keeping each one's best finish.
  const comparisonDecks = useMemo(() => {
    const seen = new Set<string>();
    return [...matchingDecks]
      .sort(
        (a, b) =>
          (a.tournamentDeck.placement || Infinity) - (b.tournamentDeck.placement || Infinity),
      )
      .filter(({ deck }) => {
        if (!deck?.id || seen.has(deck.id)) return false;
        seen.add(deck.id);
        return true;
      });
  }, [matchingDecks]);
  const choices = comparisonPresets.map(option => ({
    ...option,
    decks: comparisonDecks
      .filter(
        deck =>
          !('placement' in option) ||
          (deck.tournamentDeck.placement != null &&
            deck.tournamentDeck.placement > 0 &&
            deck.tournamentDeck.placement <= option.placement),
      )
      .slice(0, option.limit),
  }));
  const selected = choices.find(option => option.id === preset) ?? choices[0];
  const ready = isLoaded && !!cardListData;
  const canCompare = ready && selected.decks.length >= 2;
  const compare = (newTab: boolean) => {
    if (!canCompare) return;
    clearComparerEntries();
    selected.decks.forEach(({ deck }) => {
      if (!deck) return;
      addComparerEntry({
        id: deck.id,
        dataType: 'deck',
        additionalData: {
          title: deck.name,
          leader1: deck.leaderCardId1 ?? undefined,
          leader2: deck.leaderCardId2 ?? undefined,
          base: deck.baseCardId ?? undefined,
        },
      });
    });
    if (newTab) window.open('/comparer', '_blank', 'noopener');
    else navigate({ to: '/comparer' });
  };

  const [csLeaderId, csBaseId] = groupKey.split('|');
  const csPage = metaInfo === 'leadersAndBase' ? 'leader-base' : 'leader';
  const searchParamsOnly =
    route === MetaRoute || route === RootRoute || route === PlanetaryQualifiersRoute;
  const colors = gradient(groupKey, metaInfo)
    .colors.map(stop => stop.color)
    .filter(Boolean);
  const accent = colors.length ? colors : ['hsl(var(--muted-foreground))'];
  const showDecksContent = (
    <>
      <Layers aria-hidden="true" />
      <span className="flex-1 text-left">Show decks</span>
      <ArrowRight aria-hidden="true" />
    </>
  );
  const statisticsContent = (
    <>
      <ChartNoAxesCombined aria-hidden="true" />
      <span className="flex-1 text-left">Card statistics</span>
      <ArrowRight aria-hidden="true" className="opacity-50" />
    </>
  );

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label="Deck group actions"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
      className={cn(
        competitionStyles.meta,
        'fixed bottom-[calc(var(--app-bottom-inset,0px)+1rem)] right-3 z-40 w-[360px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-var(--app-bottom-inset,0px)-2rem)] overflow-y-auto overscroll-contain rounded-2xl border bg-card text-card-foreground shadow-2xl outline-none sm:right-4 [&_p]:leading-snug!',
      )}
    >
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, ${[...accent, accent[accent.length - 1]].join(', ')})`,
        }}
      />
      <div className="px-5 pb-4 pt-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {ready
              ? `${matchingDecks.length.toLocaleString()} ${matchingDecks.length === 1 ? 'entry' : 'entries'} in this analysis`
              : 'Loading deck group…'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="iconMedium"
            className="-mr-2 rounded-full"
            aria-label="Close deck selection"
            onClick={close}
          >
            <X />
          </Button>
        </div>
        <TournamentDeckGroupIdentity groupKey={groupKey} metaInfo={metaInfo} />
        <div className="mt-4 space-y-1.5">
          <Button
            asChild
            className="h-11 w-full rounded-lg bg-[var(--competition-accent)] text-white hover:bg-[var(--competition-accent)] hover:opacity-90 dark:text-[#17352e]"
            aria-label="Show decks"
          >
            {searchParamsOnly ? (
              <Link
                to="."
                search={prev => ({
                  ...prev,
                  page: 'decks',
                  maDeckKey: groupKey,
                  maDeckKeyType: metaInfo,
                })}
              >
                {showDecksContent}
              </Link>
            ) : (
              <Link
                to="/tournaments/$tournamentId/decks"
                params={{ tournamentId: tournamentId! }}
                search={prev => ({ ...prev, maDeckKey: groupKey, maDeckKeyType: metaInfo })}
              >
                {showDecksContent}
              </Link>
            )}
          </Button>
          {(metaInfo === 'leaders' || metaInfo === 'leadersAndBase') && (
            <Button
              asChild
              variant="ghost"
              className="h-10 w-full rounded-lg text-muted-foreground"
              aria-label="Card statistics"
            >
              {searchParamsOnly ? (
                <Link
                  to="."
                  search={prev => ({ ...prev, page: 'card-stats', csPage, csLeaderId, csBaseId })}
                >
                  {statisticsContent}
                </Link>
              ) : (
                <Link
                  to="/tournaments/$tournamentId/card-stats"
                  params={{ tournamentId: tournamentId! }}
                  search={prev => ({ ...prev, csLeaderId, csBaseId, csPage })}
                >
                  {statisticsContent}
                </Link>
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="border-t bg-muted/25 px-5 py-4">
        <div className="hidden items-center gap-2 text-sm font-semibold sm:flex">
          <Scale className="size-4 text-[color:var(--competition-accent)]" aria-hidden="true" />
          Compare decks
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full justify-start px-0 text-sm font-semibold hover:bg-transparent sm:hidden"
          aria-expanded={comparisonExpanded}
          aria-controls={comparisonId}
          onClick={() => setComparisonExpanded(value => !value)}
        >
          <Scale className="text-[color:var(--competition-accent)]" aria-hidden="true" />
          Compare decks
          <ChevronDown
            className={cn('ml-auto transition-transform', comparisonExpanded && 'rotate-180')}
            aria-hidden="true"
          />
        </Button>
        <div id={comparisonId} className={cn(!comparisonExpanded && 'hidden sm:block')}>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose lists by tournament placement.
          </p>
          <ToggleGroup
            type="single"
            value={preset}
            onValueChange={value => {
              if (value) setPreset(value);
            }}
            aria-label="Comparison selection"
            className="mt-3 grid grid-cols-4 gap-1.5"
          >
            {choices.map(option => (
              <ToggleGroupItem
                key={option.id}
                value={option.id}
                className="h-auto min-w-0 flex-col gap-1 rounded-lg border bg-card px-1 py-2.5 text-xs data-[state=on]:border-[color:var(--competition-accent)] data-[state=on]:bg-[var(--competition-soft)] data-[state=on]:text-[color:var(--competition-accent)]"
                aria-label={`${option.label}: ${ready ? `${option.decks.length} ${option.decks.length === 1 ? 'deck' : 'decks'}` : 'loading'}`}
              >
                <span className="font-semibold">{option.label}</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {ready
                    ? `${option.decks.length} ${option.decks.length === 1 ? 'deck' : 'decks'}`
                    : '…'}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="mt-2 min-h-8 text-[11px] leading-4 text-muted-foreground" role="status">
            {!ready
              ? 'Loading deck lists…'
              : !canCompare
                ? 'At least two different deck lists are needed to compare.'
                : 'placement' in selected
                  ? `Up to 10 distinct lists that finished in the top ${selected.placement}.`
                  : `The ${selected.decks.length} highest-placed distinct lists in this analysis.`}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-lg"
              disabled={!canCompare}
              onClick={event => compare(event.ctrlKey || event.metaKey)}
              onAuxClick={event => {
                if (event.button === 1) {
                  event.preventDefault();
                  compare(true);
                }
              }}
            >
              <Scale aria-hidden="true" />
              {ready
                ? `Compare ${selected.decks.length} ${selected.decks.length === 1 ? 'deck' : 'decks'}`
                : 'Loading decks…'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-lg"
              disabled={!canCompare}
              aria-label="Open comparison in a new tab"
              title="Open comparison in a new tab"
              onClick={() => compare(true)}
            >
              <ExternalLink />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Starts a new comparison with these decks.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function TournamentDeckKeyFloater({ route }: TournamentDeckKeyFloaterProps) {
  const selection = useSelectedDeckKey();
  // A selection carried across routes is context, not a request to move focus.
  const [initialSelection] = useState(selection);
  const { key, metaInfo } = selection;
  if (!key || !metaInfo) return null;
  return (
    <DeckGroupActions
      key={`${metaInfo}:${key}`}
      route={route}
      groupKey={key}
      metaInfo={metaInfo}
      focusRequest={selection !== initialSelection ? selection : undefined}
    />
  );
}
