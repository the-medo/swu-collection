import { ChevronDown, Download, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type {
  TrainingBatch,
  TrainingDeckOption,
  TrainingMeasure,
  TrainingStatus,
} from '../../../../../shared/types/crossfire-training.ts';
import {
  comparisonFor,
  decksFor,
  matchupDescription,
  measurementsFor,
  trainingCsv,
  type Measurement,
} from './lab-data.ts';
import { number, percent } from './format.ts';
import {
  ComparisonTable,
  EmptyState,
  fieldClass,
  LabSection,
  ModelHash,
  RateChange,
} from './LabPrimitives.tsx';
import WinRateChart from './WinRateChart.tsx';

export function MatchupMatrix({
  decks,
  measurements,
  cycle,
  deck,
  opponent,
  onPair,
}: {
  decks: readonly TrainingDeckOption[];
  measurements: Measurement[];
  cycle?: number;
  deck: string;
  opponent: string;
  onPair: (deck: string, opponent: string) => void;
}) {
  return (
    <LabSection
      title="Matchup win rates"
      description="Select a cell to explore its history. Changes compare the preceding completed result for that matchup."
      contentClassName="overflow-x-auto px-3 sm:px-5"
    >
      <table
        className="w-full min-w-[530px] border-separate border-spacing-1 text-center text-xs"
        aria-label="Matchup win-rate grid"
      >
        <thead>
          <tr>
            <th className="text-left text-muted-foreground">Deck ↓ / vs →</th>
            {decks.map(d => (
              <th key={d.key} scope="col" className="px-1 py-2 font-medium">
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {decks.map(row => (
            <tr key={row.key}>
              <th scope="row" className="pr-2 text-left font-medium">
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.short}
              </th>
              {decks.map(col => {
                if (row.key === col.key)
                  return (
                    <td
                      key={col.key}
                      className="rounded-md bg-muted/40 p-3 text-muted-foreground"
                      title="Mirror excluded from deck win rates"
                    >
                      —
                    </td>
                  );
                const { selected, previous } = comparisonFor(measurements, row.key, col.key, cycle);
                const score = selected?.score,
                  active = row.key === deck && col.key === opponent;
                return (
                  <td key={col.key}>
                    <button
                      className={cn(
                        'w-full rounded-md border border-transparent px-1 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'border-primary ring-1 ring-primary',
                        !score
                          ? 'bg-muted/30 text-muted-foreground'
                          : score.rate >= 0.5
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 hover:bg-amber-500/20',
                      )}
                      onClick={() => onPair(row.key, col.key)}
                      aria-pressed={active}
                      aria-label={`${row.short} against ${col.short}: ${score ? `${percent(score.rate)}, ${score.games} games, cycle ${selected.cycle}` : 'No result in selected cycle'}`}
                    >
                      <span className="block text-sm font-semibold tabular-nums">
                        {percent(score?.rate)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {score ? `C${selected.cycle} · ${number(score.games)} games` : 'No result'}
                      </span>
                      {score && previous && (
                        <span className="mt-1 block text-[10px]">
                          <RateChange value={score.rate - previous.score.rate} />
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </LabSection>
  );
}
export function MatchupHistory({
  decks,
  measurements,
  cycle,
  deck,
  opponent,
  onPair,
}: {
  decks: readonly TrainingDeckOption[];
  measurements: Measurement[];
  cycle?: number;
  deck: string;
  opponent: string;
  onPair: (deck: string, opponent: string) => void;
}) {
  const { selected, previous, series } = comparisonFor(measurements, deck, opponent, cycle),
    score = selected?.score;
  const own = decks.find(d => d.key === deck)!,
    other = decks.find(d => d.key === opponent)!;
  const points = series.map(r => ({ id: r.id, label: `C${r.cycle}`, score: r.score }));
  return (
    <LabSection
      title={`${own.short} vs ${other.short}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="training-deck">
            Learning deck
          </label>
          <select
            id="training-deck"
            className={fieldClass}
            value={deck}
            onChange={e => onPair(e.target.value, opponent)}
          >
            {decks.map(d => (
              <option key={d.key} value={d.key}>
                {d.short}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">against</span>
          <label className="sr-only" htmlFor="training-opponent">
            Opponent deck
          </label>
          <select
            id="training-opponent"
            className={fieldClass}
            value={opponent}
            onChange={e => onPair(deck, e.target.value)}
          >
            {decks.map(d => (
              <option key={d.key} value={d.key}>
                {d.short}
              </option>
            ))}
          </select>
        </div>
      }
      contentClassName="space-y-3 px-3 sm:px-5"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <strong className="text-3xl tabular-nums" data-testid="selected-winrate">
            {percent(score?.rate)}
          </strong>
          <p className="mt-1 text-xs text-muted-foreground">
            {score
              ? `${number(score.wins)} wins / ${number(score.games)} games · cycle ${selected.cycle}`
              : deck === opponent
                ? 'Mirrors train normally; deck win-rate comparisons are excluded.'
                : 'No completed result for this selection.'}
          </p>
        </div>
        <RateChange value={score && previous ? score.rate - previous.score.rate : null} />
      </div>
      {points.length > 0 && (
        <WinRateChart points={points} label={`${own.short} win-rate history`} color={own.color} />
      )}
      <p className="text-xs text-muted-foreground">
        History across loaded cycles. Draws count in the denominator; interrupted games are
        excluded.
      </p>
      {score && (
        <p className="text-xs text-muted-foreground">
          {number(score.wins)} wins · {number(score.losses)} losses · {number(score.draws)} draws ·{' '}
          {number(score.cutoffs)} interrupted
        </p>
      )}
      {selected?.opponentHash && (
        <p className="text-xs text-muted-foreground">
          Opponent model <ModelHash hash={selected.opponentHash} />
        </p>
      )}
    </LabSection>
  );
}
export default function MatchupsSection({
  status: s,
  batches,
  deck,
  opponent,
  measure,
  cycle,
  onPair,
  onMeasure,
  onCycle,
  loading,
  loadMore,
  loadingMore,
}: {
  status: TrainingStatus;
  batches: TrainingBatch[];
  deck: string;
  opponent: string;
  measure: TrainingMeasure;
  cycle?: number;
  onPair: (deck: string, opponent: string) => void;
  onMeasure: (measure: TrainingMeasure) => void;
  onCycle: (cycle?: number) => void;
  loading: boolean;
  loadMore?: () => void;
  loadingMore: boolean;
}) {
  const decks = decksFor(s),
    measurements = measurementsFor(s, batches, measure);
  const cycles = [
    ...new Set([...batches.map(b => b.cycle), ...(s.rotation?.history.map(h => h.cycle) ?? [])]),
  ].sort((a, b) => b - a);
  const pairs = decks.flatMap((a, i) =>
    (s.rotation ? decks.filter(b => b.key !== a.key) : decks.slice(i + 1)).map(b => ({ a, b })),
  );
  const rows = pairs.map(({ a, b }) => {
    const { selected, previous } = comparisonFor(measurements, a.key, b.key, cycle);
    return {
      id: `${a.key}/${b.key}`,
      label: `${a.short} vs ${b.short}`,
      before: previous?.score,
      after: selected?.score,
      beforeNote: previous && `C${previous.cycle}`,
      afterNote: selected && `C${selected.cycle}`,
    };
  });
  function exportResults() {
    const url = URL.createObjectURL(new Blob([trainingCsv(batches)], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `crossfire-${s.run}-training.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="space-y-4" aria-label="Matchup results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Win-rate measurement"
          className="flex flex-wrap gap-1 rounded-lg border p-1"
        >
          <Button
            size="sm"
            variant={measure === 'training' ? 'default' : 'ghost'}
            aria-pressed={measure === 'training'}
            onClick={() => onMeasure('training')}
          >
            Training games
          </Button>
          <Button
            size="sm"
            variant={measure === 'evaluation' ? 'default' : 'ghost'}
            aria-pressed={measure === 'evaluation'}
            onClick={() => onMeasure('evaluation')}
          >
            Frozen opponents
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Cycle
          <select
            aria-label="Results cycle"
            className={fieldClass}
            value={cycle ?? 'latest'}
            onChange={e =>
              onCycle(e.target.value === 'latest' ? undefined : Number(e.target.value))
            }
          >
            <option value="latest">Latest per matchup</option>
            {cycle && !cycles.includes(cycle) && <option value={cycle}>Cycle {cycle}</option>}
            {cycles.map(c => (
              <option key={c} value={c}>
                Cycle {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p
        className="text-sm leading-relaxed text-muted-foreground"
        data-testid="measure-explanation"
      >
        {matchupDescription(s, measure)} Mirrors are excluded from this grid. Current unfinished
        games appear in the progress card.
      </p>
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading matchup history…
        </p>
      )}
      {!loading && !measurements.length && (
        <EmptyState>
          {measure === 'evaluation'
            ? 'Completed frozen-opponent results will appear when available. Training results remain available in the other view.'
            : 'Completed matchup batches will appear here automatically.'}
        </EmptyState>
      )}
      <div
        className={cn('grid items-start gap-4', decks.length <= 6 && 'xl:grid-cols-[1.2fr_1fr]')}
      >
        <MatchupMatrix {...{ decks, measurements, cycle, deck, opponent, onPair }} />
        <MatchupHistory {...{ decks, measurements, cycle, deck, opponent, onPair }} />
      </div>
      <LabSection
        title="All matchup comparisons"
        description={
          s.rotation
            ? 'Each row follows the learning deck. Reverse matchups have their own history.'
            : 'First named deck’s win rate, compared with its preceding result.'
        }
        actions={
          <Button variant="outline" size="sm" onClick={exportResults} disabled={!batches.length}>
            <Download className="mr-2 size-4" />
            Export training results
          </Button>
        }
      >
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            View all {rows.length} matchups
          </summary>
          <div className="mt-4">
            <ComparisonTable
              rows={rows}
              beforeLabel="Previous"
              afterLabel={cycle ? `Cycle ${cycle}` : 'Latest'}
              label="All matchup comparisons"
              onSelect={id => {
                const pair = pairs.find(p => `${p.a.key}/${p.b.key}` === id)!;
                onPair(pair.a.key, pair.b.key);
              }}
            />
          </div>
        </details>
      </LabSection>
      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Layers className="size-4" />
          {cycles.length
            ? `Loaded cycles ${Math.min(...cycles)}–${Math.max(...cycles)}`
            : 'No completed cycles loaded'}{' '}
          · {number(batches.length)} completed batches including mirrors
        </span>
        {loadMore && (
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            <ChevronDown className="mr-2 size-4" />
            {loadingMore ? 'Loading…' : 'Load earlier cycles'}
          </Button>
        )}
      </footer>
    </section>
  );
}
