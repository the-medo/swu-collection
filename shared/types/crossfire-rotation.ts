import { z } from 'zod';
import { practiceScoresSchema } from './crossfire-practice.ts';
import { trainingKey } from './crossfire-training-roster.ts';
const count = z.number().int().nonnegative().safe();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const score = z
  .object({ completed: count, wins: count, losses: count, draws: count, cutoffs: count })
  .refine(s => s.wins + s.losses + s.draws === s.completed, 'Inconsistent rotation result');
const evaluation = z
  .object({
    completed: count,
    planned: count,
    byOpponent: z.record(trainingKey, score),
    opponentHashes: z.record(trainingKey, hash),
    modelHash: hash,
  })
  .refine(
    e =>
      e.planned === 800 &&
      e.completed <= e.planned &&
      Object.keys(e.byOpponent).length === 8 &&
      Object.keys(e.opponentHashes).length === 8 &&
      Object.entries(e.byOpponent).every(
        ([key, s]) => s.completed <= 100 && key in e.opponentHashes,
      ) &&
      Object.values(e.byOpponent).reduce((n, s) => n + s.completed, 0) === e.completed,
    'Inconsistent fixed-opponent evaluation',
  );
const snapshot = z.object({
  practice: practiceScoresSchema,
  benchmark: evaluation,
  atUtc: z.string(),
});
export const rotationProgressSchema = z
  .object({
    version: z.literal('eight-deck-specialist-rotation-v1'),
    activeDeck: trainingKey,
    turn: count,
    phase: z.enum(['warmup', 'games', 'evaluate-before', 'refresh', 'evaluate-after', 'next-turn']),
    opponentIndex: count.max(7),
    refreshDone: count.max(50),
    initialEpochs: z.literal(500),
    refresherEpochs: z.literal(50),
    gamesPerOpponent: z.literal(1000),
    learnerOrder: z.array(trainingKey).length(8),
    opponentOrder: z.array(trainingKey).length(8),
    practiceHash: hash,
    decks: z
      .array(
        z.object({
          key: trainingKey,
          games: count,
          updates: count,
          initialEpochs: count.max(500),
          refresherEpochs: count,
          modelHash: hash.nullable(),
          parameters: count.nullable(),
          strategies: z
            .array(z.enum(['aggro', 'space-aggro', 'control', 'midrange', 'ramp']))
            .min(1)
            .max(5),
          beforePractice: practiceScoresSchema.nullable(),
          afterPractice: practiceScoresSchema.nullable(),
          latestPractice: practiceScoresSchema.nullable(),
        }),
      )
      .length(8),
    history: z
      .array(
        z
          .object({
            turn: count,
            cycle: count.min(1),
            deck: trainingKey,
            games: count,
            totalTrainingGames: count,
            epochs: z.literal(50),
            before: snapshot,
            after: snapshot,
            reference: z.string().max(200),
          })
          .refine(
            h =>
              h.before.benchmark.completed === 800 &&
              h.after.benchmark.completed === 800 &&
              Object.entries(h.before.benchmark.opponentHashes).every(
                ([key, hash]) => h.after.benchmark.opponentHashes[key] === hash,
              ),
            'Refresher comparisons require complete games against the same opponents',
          ),
      )
      .max(16),
    evaluation: evaluation.nullable(),
    beforeRefresh: snapshot.nullable(),
    opponentHash: hash.nullable(),
    evaluationReference: z.literal('fixed post-500-epoch specialists'),
    trainingOpponent: z.literal('latest frozen bundle belonging to the opposing deck'),
  })
  .refine(p => {
    const keys = new Set(p.decks.map(d => d.key));
    return (
      keys.size === 8 &&
      keys.has(p.activeDeck) &&
      [p.learnerOrder, p.opponentOrder].every(
        order => new Set(order).size === 8 && order.every(key => keys.has(key)),
      ) &&
      p.history.every(
        h =>
          keys.has(h.deck) && Object.keys(h.after.benchmark.byOpponent).every(key => keys.has(key)),
      ) &&
      (!p.evaluation || Object.keys(p.evaluation.byOpponent).every(key => keys.has(key)))
    );
  }, 'Inconsistent eight-deck rotation');
export type RotationProgress = z.infer<typeof rotationProgressSchema>;
