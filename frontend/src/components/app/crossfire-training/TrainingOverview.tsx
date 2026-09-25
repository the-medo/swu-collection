import { Check, Cpu, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import type { TrainingStatus } from '../../../../../shared/types/crossfire-training.ts';
import { cycleSize, nameFor, phaseFor, runHealth, scoreFrom } from './lab-data.ts';
import { matchupScore } from './metrics.ts';
import { age, gigabytes, number, percent } from './format.ts';
import { LabSection, MetricCard, ModelHash, ProgressBar } from './LabPrimitives.tsx';

export default function TrainingOverview({
  status: s,
  now,
}: {
  status: TrainingStatus;
  now: number;
}) {
  const phase = phaseFor(s),
    { live } = runHealth(s, now),
    current = s.currentBatch;
  const score = current?.mirror
    ? scoreFrom(current.learnerScore)
    : current
      ? matchupScore(current, current.decks[0], 'training')
      : null;
  const cycle = s.rotation
    ? Math.floor(s.rotation.turn / s.rotation.learnerOrder.length) + 1
    : current?.cycle;
  const diskLate =
    live && !!s.disk && now - Date.parse(s.disk.checkedAt) > (s.disk.intervalSeconds + 60) * 1000;
  const gamePhase = s.rotation
    ? s.rotation.phase === 'games'
    : !s.practice?.benchmarkProgress && s.practice?.phase !== 'warming';
  return (
    <section className="space-y-4" aria-label="Training progress">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Training totals">
        <MetricCard
          title="Training games"
          value={number(s.games)}
          detail={`${number(s.cutoffs)} interrupted · evaluations excluded`}
        />
        <MetricCard
          title="Learning updates"
          value={number(s.updates)}
          detail="Saved in recoverable checkpoints"
        />
        <MetricCard
          title={live ? 'Current cycle' : 'Recorded cycle'}
          value={number(cycle)}
          detail={`${cycleSize(s)} ${s.rotation ? 'directed ' : ''}matchups per cycle`}
        />
        <MetricCard
          title="Games / minute"
          value={
            s.games != null && s.elapsedSeconds
              ? ((60 * s.games) / s.elapsedSeconds).toFixed(0)
              : '—'
          }
          detail="Run average, including evaluation time"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <LabSection
          title={phase.title}
          description={phase.label}
          actions={<Badge variant="secondary">{phase.badge}</Badge>}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span>{live ? 'In progress' : 'Recorded progress'}</span>
              <strong className="tabular-nums">
                {number(phase.completed)}
                {phase.target ? ` / ${number(phase.target)}` : ''} {phase.unit}
              </strong>
            </div>
            {phase.target > 0 && (
              <ProgressBar
                label="Current training phase progress"
                completed={phase.completed}
                target={phase.target}
              />
            )}
            <p className="text-sm text-muted-foreground">{phase.detail}</p>
            {gamePhase && score && current && (
              <p className="text-sm">
                <strong>
                  {nameFor(s, current.learner ?? current.decks[0])} {percent(score.rate)}
                </strong>{' '}
                · {number(score.wins)} wins / {number(score.games)} games · {score.draws} draws
                {current.mirror && ' · policy mirror, not a deck matchup rate'}
              </p>
            )}
            {s.rotation?.phase === 'games' && (
              <p className="text-xs text-muted-foreground">
                Frozen opponent <ModelHash hash={s.rotation.opponentHash} />
              </p>
            )}
            {s.rotation && (
              <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                {s.rotation.initialEpochs} initial practice epochs per deck →{' '}
                {number(s.rotation.gamesPerOpponent)} games against each of{' '}
                {s.rotation.opponentOrder.length} decks, including mirrors →{' '}
                {s.rotation.refresherEpochs} refresher epochs. The rotation continues without a
                total game or time cap.
              </p>
            )}
          </div>
        </LabSection>
        <LabSection title="Runtime & checkpoints" contentClassName="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="size-4" />
              Logical CPUs
            </span>
            <strong>{s.cpus.length ? `${s.cpus.length} / 9` : '—'}</strong>
          </div>
          <p className="text-xs text-muted-foreground">{number(s.workers)} simulation workers</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Database className="size-4" />
              Disk usage
            </span>
            <strong>
              {gigabytes(s.disk?.bytes)} / {s.disk ? gigabytes(s.disk.limit) : '100 GB'}
            </strong>
          </div>
          <p
            className={cn(
              'text-xs',
              diskLate || s.disk?.ok === false
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-muted-foreground',
            )}
          >
            Disk check: {age(s.disk?.checkedAt, now)}
            {s.disk && ` · every ${s.disk.intervalSeconds / 60} minutes`}
            {diskLate && ' · overdue'}
            {s.disk?.ok === false && ' · budget check failed'}
          </p>
          <div className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Check className="size-4 shrink-0" />
            <span>
              {s.model
                ? `Latest saved ${s.rotation ? 'deck bundle' : 'model'}: ${number(s.model.games)} games`
                : 'Waiting for a saved model'}
              {s.model && (
                <span className="mt-1 block">
                  <ModelHash hash={s.model.sha256} />
                </span>
              )}
            </span>
          </div>
        </LabSection>
      </div>
    </section>
  );
}
