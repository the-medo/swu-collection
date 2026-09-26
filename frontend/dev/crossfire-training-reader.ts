import { open, readdir, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { practiceProgressSchema } from '../../shared/types/crossfire-practice.ts';
import { rotationProgressSchema } from '../../shared/types/crossfire-rotation.ts';
import { trainingDecks, trainingStrategies } from '../../shared/types/crossfire-training.ts';
import { trainingKey } from '../../shared/types/crossfire-training-roster.ts';
import type {
  TrainingBatch,
  TrainingHistoryPage,
  TrainingStatus,
} from '../../shared/types/crossfire-training.ts';

const count = z.number().int().nonnegative().safe();
const key = trainingKey;
const counts = z.object({
  completed: count,
  winsA: count,
  winsB: count,
  draws: count,
  cutoffs: count,
});
const score = z.object({
  completed: count,
  wins: count,
  losses: count,
  draws: count,
  cutoffs: count,
});
const batchSchema = counts.extend({
  learner: key.optional(),
  opponentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  learnerScore: score.optional(),
  block: count,
  cycle: count.min(1),
  deckKeys: z.tuple([key, key]),
  mirror: z.boolean(),
  startedAtUtc: z.string(),
  finishedAtUtc: z.string().optional(),
  byMode: z.object({ self: counts.optional(), past: counts.optional() }).optional(),
  evaluation: z
    .object({ complete: z.boolean(), byDeckIndex: z.record(z.string(), score) })
    .nullable()
    .optional(),
});
const strategyKey = z.enum(trainingStrategies.map(s => s.key));
const systemSchema = z.object({
  architecture: z.enum(['crossfire-specialists-v1', 'crossfire-specialists-v2']),
  initialization: z.enum(['fresh', 'expanded']),
  qualification: z.literal('unqualified'),
  baselineWeightsImported: z.literal(false),
  humanReplayLearning: z.enum(['planned', 'available']),
  matchupInputs: z.literal('seat-visible state only'),
  evaluationReference: z.literal('retired league model'),
  components: z
    .array(
      z.object({
        id: z.string().max(80),
        kind: z.enum(['shared', 'leader', 'strategy', 'router', 'matchup', 'scorer', 'value']),
        label: z.string().max(100),
        parameters: count,
        decisions: count,
        updates: count,
      }),
    )
    .max(100),
  leaders: z
    .array(
      z.object({
        key,
        label: z.string().max(100),
        cardId: z.string().max(150),
        strategies: z.array(strategyKey).min(1).max(5),
      }),
    )
    .max(32),
  decks: z
    .array(
      z.object({
        key,
        label: z.string().max(100),
        leaderKey: key,
        strategies: z.array(strategyKey).min(1).max(5),
      }),
    )
    .max(32)
    .optional(),
  inheritedGames: count.optional(),
  inheritedUpdates: count.optional(),
});
const baselineSchema = z.object({
  games: count,
  updates: count,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const statusSchema = z.object({
  rotation: rotationProgressSchema.optional(),
  curriculum: practiceProgressSchema.optional(),
  focusLeader: trainingKey.optional(),
  humanLearning: z
    .object({
      games: count,
      decisions: count,
      updates: count,
      validationGames: count,
      skipped: z.array(z.unknown()),
    })
    .optional(),
  status: z.enum(['ready', 'training', 'evaluating', 'stopped', 'failed']),
  pid: count.optional(),
  updatedAtUtc: z.string().optional(),
  atUtc: z.string().optional(),
  games: count.nullable().optional(),
  updates: count.optional(),
  cutoffs: count.optional(),
  elapsedSeconds: z.number().finite().nonnegative().optional(),
  cpus: z.array(count).optional(),
  workers: count.optional(),
  batch: batchSchema.optional(),
  lastCompletedBatch: z.object({ block: count }).nullable().optional(),
  system: systemSchema.optional(),
  anchor: baselineSchema.optional(),
});
const failureSchema = z.object({
  status: z.literal('failed'),
  pid: count,
  atUtc: z.iso.datetime({ offset: true }),
});
const modelSchema = z.object({
  games: count,
  updates: count,
  parameters: count,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  system: systemSchema.optional(),
  contract: z
    .object({
      decks: z
        .array(z.object({ key, label: z.string().max(100).optional() }))
        .min(2)
        .max(32),
    })
    .optional(),
});
const diskSchema = z.object({
  allocatedBytes: count.optional(),
  limitBytes: count,
  checkedAtUtc: z.string(),
  intervalSeconds: count,
  status: z.string(),
});

export function compactBatch(
  raw: unknown,
  decks: readonly { key: string }[] = trainingDecks,
): TrainingBatch {
  const b = batchSchema.parse(raw);
  if (
    b.mirror !== (b.deckKeys[0] === b.deckKeys[1]) ||
    (!b.mirror && b.winsA + b.winsB + b.draws !== b.completed)
  )
    throw new Error('Inconsistent training result');
  if (
    b.learner &&
    (b.learner !== b.deckKeys[0] ||
      !b.opponentHash ||
      !b.learnerScore ||
      b.learnerScore.completed !== b.completed ||
      b.learnerScore.wins + b.learnerScore.losses + b.learnerScore.draws !== b.completed)
  )
    throw new Error('Inconsistent learner-specific result');
  const evaluation: TrainingBatch['evaluation'] = {};
  if (!b.mirror && b.evaluation?.complete) {
    for (const [index, value] of Object.entries(b.evaluation.byDeckIndex)) {
      const deck = decks[Number(index)];
      if (
        !deck ||
        !b.deckKeys.includes(deck.key) ||
        value.wins + value.losses + value.draws !== value.completed
      )
        throw new Error('Inconsistent evaluation result');
      evaluation[deck.key] = value;
    }
  }
  return {
    ...(b.learner
      ? { learner: b.learner, opponentModelHash: b.opponentHash, learnerScore: b.learnerScore }
      : {}),
    block: b.block,
    cycle: b.cycle,
    decks: b.deckKeys,
    mirror: b.mirror,
    startedAt: b.startedAtUtc,
    finishedAt: b.finishedAtUtc ?? null,
    counts: counts.parse(b),
    byMode: b.byMode ?? {},
    evaluation,
  };
}

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException)?.code === 'ENOENT';
const PAGE_SIZE = 210; // Ten cycles per request; older pages remain accessible.
const MAX_JSON_BYTES = 2 * 1024 * 1024;

/** The run directory is server-owned. The browser supplies only a history cursor. */
export class TrainingReader {
  private decks: NonNullable<TrainingStatus['decks']> = [...trainingDecks];
  private cache = new Map<string, { signature: string; value: TrainingBatch }>();
  constructor(private readonly runDirectory: string) {}

  private async read(name: string, cached = false): Promise<unknown | null> {
    let file;
    try {
      // Refuse links out of the run, including symlinked batch directories.
      const root = await realpath(this.runDirectory);
      const target = path.join(root, name);
      const parent = await realpath(path.dirname(target));
      if (parent !== root && !parent.startsWith(root + path.sep))
        throw new Error('Invalid report path');
      file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > MAX_JSON_BYTES) throw new Error('Invalid report size');
      const signature = `${stat.ino}:${stat.mtimeMs}:${stat.size}`;
      const existing = this.cache.get(name);
      if (cached && existing?.signature === signature) return existing.value;
      const raw: unknown = JSON.parse(await file.readFile('utf8'));
      if (!cached) return raw;
      const value = compactBatch(raw, this.decks);
      this.cache.set(name, { signature, value });
      if (this.cache.size > PAGE_SIZE * 3) this.cache.delete(this.cache.keys().next().value!);
      return value;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    } finally {
      await file?.close();
    }
  }

  private setDecks(model: z.infer<typeof modelSchema> | null) {
    this.decks = model?.contract?.decks.map((deck, index) => {
      const previous = trainingDecks.find(d => d.key === deck.key);
      const name = deck.label ?? previous?.name ?? deck.key;
      return {
        key: deck.key,
        name,
        short: previous?.short ?? name,
        color: previous?.color ?? trainingDecks[index % trainingDecks.length]!.color,
      };
    }) ?? [...trainingDecks];
  }

  async status(now = new Date()): Promise<TrainingStatus> {
    const [raw, diskRaw, modelRaw, failureRaw] = await Promise.all([
      this.read('status.json'),
      this.read('disk-usage.json'),
      this.read('latest-model.json'),
      this.read('failure.json'),
    ]);
    const s = raw === null ? null : statusSchema.parse(raw);
    // A failure is a separate bounded marker: even a disk-budget failure must
    // leave the last complete per-deck report readable. Old markers must not
    // override a resumed run, including when the operating system reuses a PID.
    const failure = failureRaw === null ? null : failureSchema.safeParse(failureRaw);
    if (
      s &&
      failure?.success &&
      failure.data.pid === s.pid &&
      Date.parse(failure.data.atUtc) >= Date.parse(s.updatedAtUtc ?? s.atUtc ?? '')
    ) {
      s.status = 'failed';
      s.updatedAtUtc = failure.data.atUtc;
    }
    const disk = diskRaw === null ? null : diskSchema.parse(diskRaw);
    const model = modelRaw === null ? null : modelSchema.parse(modelRaw);
    this.setDecks(model);
    let processAlive: boolean | null = null;
    if (s?.pid && s.pid > 0 && ['training', 'evaluating'].includes(s.status)) {
      try {
        process.kill(s.pid, 0);
        processAlive = true;
      } catch (error) {
        processAlive = (error as NodeJS.ErrnoException).code === 'ESRCH' ? false : null;
      }
    }
    return {
      run: path.basename(this.runDirectory),
      rotation: s?.rotation ?? null,
      focusLeader: s?.focusLeader ?? null,
      practice: s?.curriculum ?? null,
      humanLearning: s?.humanLearning
        ? {
            games: s.humanLearning.games,
            decisions: s.humanLearning.decisions,
            updates: s.humanLearning.updates,
            validationGames: s.humanLearning.validationGames,
            skippedGames: s.humanLearning.skipped.length,
          }
        : null,
      fetchedAt: now.toISOString(),
      state: s?.status ?? 'unavailable',
      processAlive,
      updatedAt: s?.updatedAtUtc ?? s?.atUtc ?? null,
      games: s?.games ?? null,
      updates: s?.updates ?? null,
      cutoffs: s?.cutoffs ?? null,
      elapsedSeconds: s?.elapsedSeconds ?? null,
      cpus: s?.cpus ?? [],
      workers: s?.workers ?? null,
      decks: this.decks,
      currentBatch: s?.batch ? compactBatch(s.batch, this.decks) : null,
      lastCompletedBlock: s?.lastCompletedBatch?.block ?? null,
      disk: disk
        ? {
            bytes: disk.allocatedBytes ?? null,
            limit: disk.limitBytes,
            checkedAt: disk.checkedAtUtc,
            intervalSeconds: disk.intervalSeconds,
            ok: disk.status === 'ok',
          }
        : null,
      model: model
        ? {
            games: model.games,
            updates: model.updates,
            parameters: model.parameters,
            sha256: model.sha256,
          }
        : null,
      system: s?.rotation ? null : (s?.system ?? model?.system ?? null),
      baseline: s?.anchor ?? null,
    };
  }

  async history(before?: number): Promise<TrainingHistoryPage> {
    const model = await this.read('latest-model.json');
    this.setDecks(model === null ? null : modelSchema.parse(model));
    const raw = await this.read('status.json');
    const status = raw === null ? null : statusSchema.parse(raw);
    // Ignore reports newer than the trainer's committed publication frontier after recovery.
    let frontier = status?.lastCompletedBatch?.block;
    if (frontier === undefined && status?.status === 'failed') {
      // Failure status is intentionally minimal; retain access to saved history.
      const rawIndex = await this.read('checkpoints.json');
      const index =
        rawIndex === null
          ? null
          : z.object({ current: z.object({ games: count }) }).parse(rawIndex);
      if (index) frontier = Math.floor(index.current.games / 1000) - 1;
    }
    if (frontier === undefined) return { batches: [], nextBefore: null };
    let names: string[];
    try {
      names = await readdir(path.join(this.runDirectory, 'batches'));
    } catch (error) {
      if (isMissing(error)) return { batches: [], nextBefore: null };
      throw error;
    }
    const selected = names
      .filter(name => /^\d{8,}\.json$/.test(name))
      .map(name => ({ name, block: Number(name.slice(0, -5)) }))
      .filter(f => f.block <= frontier && (before === undefined || f.block < before))
      .sort((a, b) => b.block - a.block)
      .slice(0, PAGE_SIZE + 1);
    const page = selected.slice(0, PAGE_SIZE).reverse();
    const batches: TrainingBatch[] = [];
    // Small groups avoid a burst of hundreds of file reads alongside training.
    for (let offset = 0; offset < page.length; offset += 8) {
      const group = page.slice(offset, offset + 8);
      const values = await Promise.all(group.map(f => this.read(`batches/${f.name}`, true)));
      for (const [i, value] of values.entries()) {
        if (value === null) throw new Error('A published batch is missing');
        const batch = value as TrainingBatch;
        if (batch.block !== group[i]!.block || batch.counts.completed !== 1000 || !batch.finishedAt)
          throw new Error('Invalid completed batch');
        batches.push(batch);
      }
    }
    return { batches, nextBefore: selected.length > PAGE_SIZE ? page[0]!.block : null };
  }
}
