import { z } from 'zod';
import { trainingStrategies } from './crossfire-training.ts';

export const trainingKey = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const archetypeSchema = z.enum(trainingStrategies.map(s => s.key));
export const archetypesSchema = z
  .array(archetypeSchema)
  .min(1)
  .max(5)
  .refine(values => new Set(values).size === values.length, 'Choose each archetype only once');
export const rosterDeckSchema = z.strictObject({
  key: trainingKey,
  label: z.string().trim().min(1).max(100),
  leaderKey: trainingKey,
  strategies: archetypesSchema,
  snapshot: z.unknown(),
});
export const trainingRosterSchema = z
  .strictObject({
    version: z.literal(1),
    leaders: z
      .array(
        z.strictObject({
          key: trainingKey,
          label: z.string().min(1).max(100),
          cardId: z.string().min(1).max(120),
        }),
      )
      .min(1)
      .max(32),
    decks: z.array(rosterDeckSchema).min(2).max(32),
  })
  .superRefine((roster, ctx) => {
    for (const [name, values] of [
      ['deck keys', roster.decks.map(d => d.key)],
      ['leader keys', roster.leaders.map(l => l.key)],
      ['leader cards', roster.leaders.map(l => l.cardId)],
    ] as const) {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', message: `Duplicate ${name}` });
    }
    if (
      roster.leaders.some(l => l.key === 'fallback' || !roster.decks.some(d => d.leaderKey === l.key)) ||
      roster.decks.some(d => !roster.leaders.some(l => l.key === d.leaderKey))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid leader routing' });
  });
export const inspectTrainingDeckSchema = z.strictObject({ deckId: z.uuid() });
export const addTrainingDeckSchema = inspectTrainingDeckSchema.extend({
  archetypes: archetypesSchema,
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.uuid(),
});
export type AddTrainingDeck = z.infer<typeof addTrainingDeckSchema>;
export interface TrainingRuns {
  revision: string;
  activeRun: string;
  runs: { id: string; label: string }[];
  mutationToken?: string;
}
export interface TrainingDeckInspection {
  deckId: string;
  name: string;
  leader: string | null;
  leaderName: string;
  baseName: string;
  cards: number;
  ready: boolean;
  contentHash?: string;
  issues: { code: string; cardId?: string; zone?: string }[];
}
