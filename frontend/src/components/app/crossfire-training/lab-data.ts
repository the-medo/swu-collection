/** Presentation adapters: saved run formats enter here; sections consume the same data. */
import type { PracticeProgress } from '../../../../../shared/types/crossfire-practice.ts';
import type {
  TrainingBatch,
  TrainingStatus,
  TrainingDeckOption,
  TrainingMeasure,
  EvaluationCounts,
  SpecialistComponent,
  TrainingStrategy,
} from '../../../../../shared/types/crossfire-training.ts';
import { trainingDecks } from '../../../../../shared/types/crossfire-training.ts';
import { matchupScore } from './metrics.ts';
import { number } from './format.ts';

export type PracticeScores = NonNullable<PracticeProgress['before']>;
export type Score = NonNullable<ReturnType<typeof matchupScore>>;
export interface Measurement {
  id: string;
  deck: string;
  opponent: string;
  cycle: number;
  order: number;
  score: Score;
  modelHash?: string;
  opponentHash?: string;
}
export interface PracticeData {
  deck: string;
  before: PracticeScores | null;
  after: PracticeScores | null;
  latest: PracticeScores | null;
  beforeLabel: string;
  afterLabel: string;
  description: string;
  notice?: string;
}
export interface EvaluationReport {
  id: string;
  label: string;
  beforeLabel: string;
  afterLabel: string;
  before: Partial<Record<string, Score>>;
  after: Partial<Record<string, Score>>;
  beforeHash?: string;
  afterHash: string;
  practice: PracticeScores;
  comparable: boolean;
}
export interface ModelCardData {
  id: string;
  label: string;
  deck?: string;
  strategies?: readonly TrainingStrategy[];
  parameters?: number | null;
  decisions?: number;
  updates?: number;
  games?: number;
  epochs?: { completed: number; target: number };
  refreshEpochs?: number;
  modelHash?: string | null;
  active?: boolean;
  eligible?: boolean;
  note?: string;
}
export interface ModelGroup {
  title: string;
  description: string;
  cards: ModelCardData[];
}
export interface PhaseData {
  title: string;
  label: string;
  detail: string;
  completed: number;
  target: number;
  unit: string;
  badge: string;
}

export const decksFor = (s: TrainingStatus): readonly TrainingDeckOption[] =>
  s.decks?.length ? s.decks : trainingDecks;
export const nameFor = (s: TrainingStatus, key: string) =>
  decksFor(s).find(d => d.key === key)?.short ?? key;
export function scoreFrom(s: EvaluationCounts | undefined): Score | null {
  return s?.completed ? { ...s, games: s.completed, rate: s.wins / s.completed } : null;
}
const scoreMap = (values: Record<string, EvaluationCounts>) =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, counts]) => {
      const score = scoreFrom(counts);
      return score ? [[key, score]] : [];
    }),
  );
export const cycleSize = (s: TrainingStatus) => {
  const n = decksFor(s).length;
  if (s.rotation) return n * n;
  if (s.focusLeader) {
    const learners = s.system?.decks?.filter(d => d.leaderKey === s.focusLeader).length || 1;
    return learners * n;
  }
  return (n * (n + 1)) / 2;
};
export function runHealth(s: TrainingStatus | undefined, now: number) {
  const live = !!s && ['training', 'evaluating'].includes(s.state) && s.processAlive !== false;
  const stale = !!s?.updatedAt && now - Date.parse(s.updatedAt) > 120_000;
  const label = !s
    ? 'Connecting'
    : s.processAlive === false && ['training', 'evaluating'].includes(s.state)
      ? 'Process stopped'
      : live && stale
        ? 'Waiting for update'
        : {
            ready: 'Prepared · training stopped',
            training: 'Training live',
            evaluating: 'Evaluating',
            stopped: 'Stopped',
            failed: 'Failed',
            unavailable: 'No run found',
          }[s.state];
  return { live, stale, label };
}
export function phaseFor(s: TrainingStatus): PhaseData {
  const p = s.rotation,
    b = s.currentBatch;
  const base = {
    title: b ? `${nameFor(s, b.decks[0])} vs ${nameFor(s, b.decks[1])}` : 'Waiting for a matchup',
    label: 'Training batch',
    completed: b?.counts.completed ?? 0,
    target: p?.gamesPerOpponent ?? 1000,
    unit: 'games',
    badge: b ? `Batch ${b.block + 1}` : 'Waiting',
    detail:
      s.state === 'ready'
        ? 'Prepared matchup. Training has not started.'
        : b?.mirror
          ? 'Mirror practice contributes training games; deck win-rate comparisons exclude mirrors.'
          : 'Completed games in this matchup. Evaluations are counted separately.',
  };
  if (p) {
    const who = nameFor(s, p.activeDeck);
    const active = p.decks.find(d => d.key === p.activeDeck)!;
    if (p.phase === 'warmup')
      return {
        ...base,
        title: `${who} · initial practice`,
        label: 'Practice',
        completed: active.initialEpochs,
        target: p.initialEpochs,
        unit: 'epochs',
        badge: `${p.decks.filter(d => d.initialEpochs === p.initialEpochs).length}/${p.decks.length} decks ready`,
        detail: 'Every deck completes initial practice before full-game training begins.',
      };
    if (p.phase === 'refresh')
      return {
        ...base,
        title: `${who} · practice refresher`,
        label: 'Practice',
        completed: p.refreshDone,
        target: p.refresherEpochs,
        unit: 'epochs',
        detail: 'Rehearsing training families between identical fixed-opponent evaluations.',
      };
    if (p.phase.startsWith('evaluate'))
      return {
        ...base,
        title: `${who} · ${p.phase === 'evaluate-before' ? 'before' : 'after'} refresher`,
        label: 'Fixed-opponent evaluation',
        completed: p.evaluation?.completed ?? 0,
        target: p.evaluation?.planned ?? p.opponentOrder.length * 100,
        detail: 'Fixed initial specialists and paired seeds. These games do not update the model.',
      };
    if (p.phase === 'next-turn')
      return {
        ...base,
        title: 'Loading the next learner',
        label: 'Specialist rotation',
        completed: 0,
        target: 0,
        detail:
          'Saving the completed turn and restoring the next deck’s own weights and optimizer.',
      };
    return {
      ...base,
      label: `${who} learning · opponent ${p.opponentIndex + 1}/${p.opponentOrder.length}`,
      detail: `Only ${who} learns in this block. The opposing deck uses its own frozen specialist.`,
    };
  }
  const practice = s.practice;
  if (practice?.benchmarkProgress)
    return {
      ...base,
      title: `${nameFor(s, s.focusLeader ?? 'krennic')} · frozen opponents`,
      label: 'Fixed-opponent evaluation',
      completed: practice.benchmarkProgress.completed,
      target: practice.benchmarkProgress.planned,
      detail: 'Paired seeds against the unchanged reference model; no learning updates.',
    };
  if (practice?.phase === 'warming')
    return {
      ...base,
      title: 'Learning practice choices',
      label: 'Practice',
      completed: practice.epochs,
      target: 0,
      unit: 'epochs',
      detail: 'The learning check evaluates reference choices before full games begin.',
    };
  if (practice?.phase === 'gate-failed')
    return {
      ...base,
      label: 'Learning check needs attention',
      detail: [practice.reason, practice.gate].filter(Boolean).join(' '),
    };
  return base;
}

export function rosterCards(s: TrainingStatus): ModelCardData[] {
  return decksFor(s).map(d => {
    const rotating = s.rotation?.decks.find(m => m.key === d.key);
    if (rotating)
      return {
        id: d.key,
        label: d.name,
        deck: d.key,
        strategies: rotating.strategies,
        parameters: rotating.parameters,
        updates: rotating.updates,
        games: rotating.games,
        epochs: { completed: rotating.initialEpochs, target: s.rotation!.initialEpochs },
        refreshEpochs: rotating.refresherEpochs,
        modelHash: rotating.modelHash,
        active: s.rotation!.activeDeck === d.key,
      };
    const list = s.system?.decks?.find(m => m.key === d.key);
    const leader = s.system?.leaders.find(l => l.key === (list?.leaderKey ?? d.key));
    return {
      id: d.key,
      label: d.name,
      deck: d.key,
      strategies: list?.strategies ?? leader?.strategies,
      note: leader ? `Leader specialist: ${leader.label}` : 'Uses the shared policy.',
    };
  });
}
export function modelGroups(s: TrainingStatus): ModelGroup[] {
  if (s.rotation) return []; // Rotation reports expose bundle counters, not individual module counters.
  if (!s.system)
    return s.model
      ? [
          {
            title: 'Shared model',
            description: 'One saved policy serves the whole roster.',
            cards: [
              {
                id: 'shared',
                label: 'Shared Crossfire policy',
                parameters: s.model.parameters,
                games: s.model.games,
                updates: s.model.updates,
                modelHash: s.model.sha256,
              },
            ],
          },
        ]
      : [];
  const toCard = (c: SpecialistComponent): ModelCardData => {
    const leader = s.system!.leaders.find(l => c.id === `leader:${l.key}`);
    const list = s.system!.decks?.find(d => d.leaderKey === leader?.key);
    return {
      id: c.id,
      label: c.label,
      parameters: c.parameters,
      decisions: c.decisions,
      updates: c.updates,
      eligible: c.kind === 'strategy',
      ...(leader ? { deck: list?.key ?? leader.key, strategies: leader.strategies } : {}),
      ...(c.kind === 'strategy'
        ? { strategies: [c.id.replace('strategy:', '') as TrainingStrategy] }
        : {}),
    };
  };
  return [
    {
      title: 'Leader specialists',
      description: 'Decks with the same leader share this module.',
      components: s.system.components.filter(
        c => c.kind === 'leader' && c.id !== 'leader:fallback',
      ),
    },
    {
      title: 'Strategy specialists',
      description:
        'Counts measure training eligibility. The router learns the mix among each deck’s assigned strategies.',
      components: s.system.components.filter(c => c.kind === 'strategy'),
    },
    {
      title: 'Shared components',
      description:
        'Encoder, router, matchup adapter, action scorer, critic, and fallback knowledge.',
      components: s.system.components.filter(
        c => !['leader', 'strategy'].includes(c.kind) || c.id === 'leader:fallback',
      ),
    },
  ].map(({ title, description, components }) => ({
    title,
    description,
    cards: components.map(toCard),
  }));
}
export function practiceFor(s: TrainingStatus, deck: string): PracticeData | null {
  const r = s.rotation?.decks.find(d => d.key === deck);
  if (r)
    return {
      deck,
      before: r.beforePractice,
      after: r.afterPractice,
      latest: r.latestPractice,
      beforeLabel: `Before ${s.rotation!.initialEpochs} epochs`,
      afterLabel: `After ${s.rotation!.initialEpochs} epochs`,
      description:
        'Twelve scenario families, four variations each. Ten families train the model; two entire families stay held out.',
    };
  const p = s.practice;
  if (!p || deck !== (s.focusLeader ?? 'krennic')) return null;
  const latest = p.history[p.history.length - 1];
  return {
    deck,
    before: p.before,
    after: p.after,
    latest: latest?.kind === 'before-warmup' ? p.after : (latest?.practice ?? p.after),
    beforeLabel: 'Before practice',
    afterLabel: 'After practice',
    description: `${number(p.epochs)} practice epochs. Held-out families are excluded from training.`,
    notice:
      p.passed === false
        ? [p.reason, p.gate].filter(Boolean).join(' ')
        : p.passed
          ? 'Learning check passed'
          : 'Learning check in progress',
  };
}
const practiceLabel = (h: PracticeProgress['history'][number]) =>
  h.kind === 'before-warmup'
    ? 'Before practice'
    : h.kind === 'after-warmup'
      ? 'After practice'
      : `${number(h.games)} games`;
export function evaluationsFor(s: TrainingStatus, deck: string): EvaluationReport[] {
  if (s.rotation)
    return s.rotation.history
      .filter(h => h.deck === deck)
      .map(h => ({
        id: `turn-${h.turn}`,
        label: `${number(h.games)} games · cycle ${h.cycle}`,
        beforeLabel: `Before ${h.epochs} epochs`,
        afterLabel: `After ${h.epochs} epochs`,
        before: scoreMap(h.before.benchmark.byOpponent),
        after: scoreMap(h.after.benchmark.byOpponent),
        beforeHash: h.before.benchmark.modelHash,
        afterHash: h.after.benchmark.modelHash,
        practice: h.after.practice,
        comparable: Object.entries(h.before.benchmark.opponentHashes).every(
          ([key, hash]) => h.after.benchmark.opponentHashes[key] === hash,
        ),
      }));
  if (!s.practice || deck !== (s.focusLeader ?? 'krennic')) return [];
  const first = s.practice.history.find(h => h.kind === 'before-warmup');
  return s.practice.history.map(h => ({
    id: `${h.kind}-${h.games}`,
    label: practiceLabel(h),
    beforeLabel: 'Before practice',
    afterLabel: practiceLabel(h),
    before: first ? scoreMap(first.benchmark.byOpponent) : {},
    after: scoreMap(h.benchmark.byOpponent),
    beforeHash: first?.modelHash,
    afterHash: h.modelHash,
    practice: h.practice,
    comparable:
      !!first &&
      first.anchorHash === h.anchorHash &&
      first.benchmark.schedule === h.benchmark.schedule,
  }));
}

/** Directed measurements prevent a frozen opponent's wins becoming that deck's learning results. */
export function measurementsFor(
  s: TrainingStatus,
  batches: TrainingBatch[],
  measure: TrainingMeasure,
): Measurement[] {
  if (s.rotation && measure === 'evaluation')
    return s.rotation.history.flatMap(h =>
      Object.entries(h.after.benchmark.byOpponent).flatMap(([opponent, counts]) => {
        const score = scoreFrom(counts);
        return opponent !== h.deck && score
          ? [
              {
                id: `evaluation-${h.turn}-${opponent}`,
                deck: h.deck,
                opponent,
                cycle: h.cycle,
                order: h.turn,
                score,
                modelHash: h.after.benchmark.modelHash,
                opponentHash: h.after.benchmark.opponentHashes[opponent],
              },
            ]
          : [];
      }),
    );
  return batches
    .filter(b => !b.mirror && b.finishedAt)
    .flatMap(b =>
      (b.learner ? [b.learner] : b.decks).flatMap(deck => {
        const score = matchupScore(b, deck, measure);
        return score
          ? [
              {
                id: `${b.block}-${deck}-${measure}`,
                deck,
                opponent: b.decks.find(d => d !== deck)!,
                cycle: b.cycle,
                order: b.block,
                score,
                opponentHash: b.opponentModelHash,
              },
            ]
          : [];
      }),
    );
}
export function measurementSeries(values: Measurement[], deck: string, opponent: string) {
  return values
    .filter(v => v.deck === deck && v.opponent === opponent)
    .sort((a, b) => a.order - b.order);
}
export function selectedMeasurement(values: Measurement[], cycle?: number) {
  if (cycle === undefined) return values[values.length - 1];
  for (let i = values.length - 1; i >= 0; i--) if (values[i].cycle === cycle) return values[i];
  return undefined;
}
export function comparisonFor(
  values: Measurement[],
  deck: string,
  opponent: string,
  cycle?: number,
) {
  const series = measurementSeries(values, deck, opponent),
    selected = selectedMeasurement(series, cycle);
  const previous = selected ? series[series.indexOf(selected) - 1] : undefined;
  return { series, selected, previous };
}
export function matchupDescription(s: TrainingStatus, measure: TrainingMeasure) {
  if (s.rotation)
    return measure === 'training'
      ? 'Each completed batch contains 1,000 games: 500 from each seat. Rows identify the learning deck; columns identify its frozen specialist opponent. The reverse matchup is a separate batch.'
      : 'Completed post-refresher evaluations against the fixed initial specialists: 100 games per opponent, using 50 seeds from both seats. No learning updates. The latest 16 completed turns are available.';
  if (measure === 'training' && s.focusLeader)
    return `Completed 1,000-game batches. Only ${nameFor(s, s.focusLeader)} learns; opposing decks use frozen models. Rates describe these training games, not the separate fixed-opponent checks.`;
  return measure === 'training'
    ? 'Each completed batch contains 1,000 games: 750 self-play games and 250 against recent frozen snapshots. Self-play learns from both sides; snapshot games learn from the current model.'
    : `Separate progress checks against the ${s.system ? 'retired league model' : 'unchanged starting model'}. Samples are shown per result; these games do not update the model.`;
}
export function trainingCsv(batches: TrainingBatch[]) {
  const rows: (string | number)[][] = [
    [
      'cycle',
      'batch',
      'deck_a',
      'deck_b',
      'learner',
      'opponent_model',
      'completed',
      'wins_a',
      'wins_b',
      'draws',
      'cutoffs',
      'win_rate_a',
    ],
  ];
  for (const b of batches.filter(b => !b.mirror && b.finishedAt))
    rows.push([
      b.cycle,
      b.block + 1,
      ...b.decks,
      b.learner ?? '',
      b.opponentModelHash ?? '',
      b.counts.completed,
      b.counts.winsA,
      b.counts.winsB,
      b.counts.draws,
      b.counts.cutoffs,
      b.counts.completed ? b.counts.winsA / b.counts.completed : '',
    ]);
  return rows
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
