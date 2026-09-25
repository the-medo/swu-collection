import { z } from 'zod';
const count = z.number().int().nonnegative().safe();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const totals = z.object({ correct: count, choices: count, exactLines: count, lines: count });
const section = totals
  .extend({
    families: z
      .array(totals.extend({ id: z.string().max(100), title: z.string().max(150) }))
      .max(32),
  })
  .refine(
    s =>
      s.correct <= s.choices &&
      s.exactLines <= s.lines &&
      s.families.every(f => f.correct <= f.choices && f.exactLines <= f.lines),
    'Invalid practice counts',
  );
export const practiceScoresSchema = z.object({ train: section, heldout: section });
const scores = practiceScoresSchema;
const results = z
  .object({ completed: count, wins: count, losses: count, draws: count, cutoffs: count })
  .refine(s => s.wins + s.losses + s.draws === s.completed, 'Invalid benchmark counts');
export const practiceProgressSchema = z.object({
  version: z.literal('krennic-practice-v1'),
  hash,
  phase: z.enum(['warming', 'ready', 'gate-failed', 'benchmarking', 'self-play', 'complete']),
  passed: z.boolean().nullable(),
  epochs: count,
  before: scores.nullable(),
  after: scores.nullable(),
  gate: z.string().max(250).optional(),
  reason: z.string().max(150).optional(),
  targetGames: count.positive().nullable(),
  startedGames: count,
  benchmarkProgress: z.object({ completed: count, planned: count }).nullable(),
  history: z
    .array(
      z.object({
        kind: z.enum(['before-warmup', 'after-warmup', 'self-play']),
        games: count,
        atUtc: z.string(),
        modelHash: hash,
        anchorHash: hash,
        practice: scores,
        benchmark: z.object({
          complete: z.literal(true),
          schedule: z.string().max(100),
          games: count,
          pairs: count,
          byOpponent: z.record(z.string().max(100), results),
          qualification: z.string().max(150),
        }),
      }),
    )
    .max(24),
});
export type PracticeProgress = z.infer<typeof practiceProgressSchema>;
