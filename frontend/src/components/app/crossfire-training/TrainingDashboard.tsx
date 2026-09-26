import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Activity, RefreshCw } from 'lucide-react';
import { Route } from '@/routes/tools/crossfire-training/index.tsx';
import {
  useTrainingDashboard,
  useTrainingRuns,
} from '@/api/crossfire-training/useTrainingDashboard.ts';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import AddTrainingDeck from './AddTrainingDeck.tsx';
import TrainingOverview from './TrainingOverview.tsx';
import ModelOverview from './ModelOverview.tsx';
import MatchupsSection from './MatchupsSection.tsx';
import PracticeSection from './PracticeSection.tsx';
import EvaluationSection from './EvaluationSection.tsx';
import HumanLearningSection from './HumanLearningSection.tsx';
import { EmptyState, fieldClass, LabSection } from './LabPrimitives.tsx';
import { decksFor, evaluationsFor, nameFor, practiceFor, runHealth } from './lab-data.ts';
import { mergeBatches } from './metrics.ts';
import { age, number } from './format.ts';

/** Owns queries and URL selection; all run formats render through the same sections. */
export default function TrainingDashboard() {
  const { aiDeck, aiOpponent, aiMeasure: measure, aiCycle: cycle, aiRun } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const runs = useTrainingRuns();
  const run = aiRun ?? runs.data?.activeRun ?? 'specialists';
  const { status, history } = useTrainingDashboard(run);
  const s = status.data;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const batches = useMemo(() => mergeBatches(history.data?.pages ?? []), [history.data]);
  const oldestCycle = batches[0]?.cycle;
  const { fetchNextPage, hasNextPage, isFetching, isError } = history;
  useEffect(() => {
    if (cycle && oldestCycle && cycle <= oldestCycle && hasNextPage && !isFetching && !isError)
      void fetchNextPage();
  }, [cycle, oldestCycle, hasNextPage, isFetching, isError, fetchNextPage]);
  const decks = s ? decksFor(s) : [];
  const deck = decks.find(d => d.key === aiDeck)?.key ?? decks[0]?.key ?? aiDeck;
  const opponent = decks.find(d => d.key === aiOpponent)?.key ?? decks[1]?.key ?? aiOpponent;
  const { live, stale, label } = runHealth(s, now);
  const error = status.error || history.error || runs.error;
  const practice = s ? practiceFor(s, deck) : null;
  const reports = s ? evaluationsFor(s, deck) : [];
  const choosePair = (own: string, other: string) =>
    void navigate({ search: prev => ({ ...prev, aiDeck: own, aiOpponent: other }) });
  const refresh = () => {
    void runs.refetch();
    void status.refetch();
    void history.refetch();
  };
  const options = runs.data?.runs ?? [{ id: run, label: 'Selected training run' }];
  const runLabel = options.find(r => r.id === run)?.label ?? 'Training run';

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-5 p-3 pb-10 sm:p-6"
      data-testid="training-dashboard"
    >
      <Helmet title="Crossfire AI lab | SWUBase" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="size-4" />
            Crossfire / AI lab
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Training dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow learning progress, compare matchups, and inspect each model’s practice.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <span
              className={cn(
                'size-2 rounded-full',
                live && !stale ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            {label}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            aria-label="Refresh training dashboard"
          >
            <RefreshCw className={cn('size-4', status.isFetching && 'animate-spin')} />
          </Button>
        </div>
      </header>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-0 max-w-full flex-wrap items-center gap-3 text-sm font-medium">
            Model run
            <select
              aria-label="Model run"
              className={fieldClass}
              value={run}
              onChange={e =>
                void navigate({
                  search: prev => ({ ...prev, aiRun: e.target.value, aiCycle: undefined }),
                })
              }
            >
              {!options.some(r => r.id === run) && <option value={run}>Selected run</option>}
              {options.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {s && !s.rotation && run !== 'legacy' && (
            <AddTrainingDeck
              runs={runs.data}
              onAdded={next =>
                void navigate({ search: prev => ({ ...prev, aiRun: next, aiCycle: undefined }) })
              }
            />
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{runLabel}</span>
          <span>Refreshes every 5 seconds</span>
          <span>Trainer update: {age(s?.updatedAt, now)}</span>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          Live refresh is unavailable. Showing the last loaded results; retrying automatically.
        </div>
      )}
      {status.isPending && (
        <p role="status" className="rounded-lg border p-6 text-muted-foreground">
          Loading training progress…
        </p>
      )}
      {s?.state === 'unavailable' && (
        <EmptyState>
          No saved reports are available for this run yet. Choose another run to inspect its
          results.
        </EmptyState>
      )}
      {s && s.state !== 'unavailable' && (
        <>
          {run === 'legacy' && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              Archived shared-policy results. These weights do not initialize the newer specialist
              models.
            </p>
          )}
          {s.focusLeader && (
            <p className="rounded-lg border bg-primary/5 p-3 text-sm">
              Training scope: <strong>{nameFor(s, s.focusLeader)}</strong>. Only this leader’s turns
              are learned; opponents use frozen models.
              {s.practice?.targetGames &&
                ` This experiment targets ${number(s.practice.targetGames)} games.`}
            </p>
          )}
          <TrainingOverview status={s} now={now} />
          <ModelOverview status={s} deck={deck} onDeck={next => choosePair(next, opponent)} />
          <MatchupsSection
            status={s}
            batches={batches}
            deck={deck}
            opponent={opponent}
            measure={measure}
            cycle={cycle}
            onPair={choosePair}
            onMeasure={next => void navigate({ search: prev => ({ ...prev, aiMeasure: next }) })}
            onCycle={next => void navigate({ search: prev => ({ ...prev, aiCycle: next }) })}
            loading={history.isPending}
            loadMore={history.hasNextPage ? () => void history.fetchNextPage() : undefined}
            loadingMore={history.isFetchingNextPage}
          />
          {(s.rotation || s.practice) && (
            <section className="space-y-4" aria-label="Practice and evaluation">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Practice & fixed-opponent checks</h2>
                <label className="flex items-center gap-2 text-sm">
                  Inspect deck
                  <select
                    aria-label="Practice deck"
                    className={fieldClass}
                    value={deck}
                    onChange={e => choosePair(e.target.value, opponent)}
                  >
                    {decks.map(d => (
                      <option key={d.key} value={d.key}>
                        {d.short}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {practice ? (
                <PracticeSection data={practice} name={nameFor(s, deck)} />
              ) : (
                <LabSection title={`${nameFor(s, deck)} · practice scenarios`}>
                  <EmptyState>
                    This run has no practice measurements for this deck. Select{' '}
                    {nameFor(s, s.focusLeader ?? 'krennic')} to inspect its curriculum.
                  </EmptyState>
                </LabSection>
              )}
              <EvaluationSection
                key={`${run}/${deck}`}
                reports={reports}
                decks={decks}
                deck={deck}
                opponent={opponent}
                onOpponent={next => choosePair(deck, next)}
                rotation={!!s.rotation}
              />
            </section>
          )}
          {(s.system || s.rotation || s.humanLearning) && (
            <HumanLearningSection data={s.humanLearning} />
          )}
        </>
      )}
    </div>
  );
}
