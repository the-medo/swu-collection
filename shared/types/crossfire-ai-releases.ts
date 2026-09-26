import { z } from 'zod';
import { archetypesSchema, trainingKey } from './crossfire-training-roster.ts';

export const aiHash = z.string().regex(/^[a-f0-9]{64}$/);
export const aiVersions = z.strictObject({
  state: z.number().int().positive(),
  engine: z.string().min(1).max(80),
  cards: z.string().min(1).max(160),
  rules: z.string().min(1).max(80),
  format: z.literal('core-practice'),
});
const count = z.number().int().nonnegative().safe();
export const aiEvaluationSchema = z
  .strictObject({
    suite: z.literal('crossfire-ai-release-v1'),
    versions: aiVersions,
    interfaceHash: aiHash,
    seed: count,
    modelHash: aiHash,
    opponentHash: aiHash,
    games: count,
    wins: count,
    losses: count,
    draws: count,
    cutoffs: count,
    replayChecked: count,
    decisions: count,
    byOpponent: z
      .array(
        z.strictObject({
          deck: trainingKey,
          games: count,
          wins: count,
          losses: count,
          draws: count,
        }),
      )
      .min(1)
      .max(32),
    byDeck: z
      .array(z.strictObject({ deck: trainingKey, games: count }))
      .min(1)
      .max(32),
  })
  .superRefine((r, ctx) => {
    if (
      r.games !== r.wins + r.losses + r.draws ||
      r.replayChecked !== r.games ||
      r.games !== r.byOpponent.reduce((n, p) => n + p.games, 0) ||
      r.games !== r.byDeck.reduce((n, p) => n + p.games, 0) ||
      new Set(r.byDeck.map(d => d.deck)).size !== r.byDeck.length ||
      new Set(r.byOpponent.map(d => d.deck)).size !== r.byOpponent.length ||
      ['wins', 'losses', 'draws'].some(
        k => r[k as 'wins'] !== r.byOpponent.reduce((n, p) => n + p[k as 'wins'], 0),
      ) ||
      r.byOpponent.some(p => p.games !== p.wins + p.losses + p.draws)
    )
      ctx.addIssue({ code: 'custom', message: 'Evaluation counters disagree' });
  });
export const aiReleaseSchema = z
  .strictObject({
    schema: z.literal(1),
    id: z.uuid(),
    label: z.string().trim().min(1).max(100),
    createdAt: z.iso.datetime(),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
    leader: z.strictObject({
      key: trainingKey,
      cardId: z.string().min(1).max(120),
      label: z.string().min(1).max(100),
    }),
    artifact: z.strictObject({ sha256: aiHash, bytes: count.positive().max(32_000_000) }),
    architecture: z.enum(['crossfire-specialists-v1', 'crossfire-specialists-v2']),
    interfaceHash: aiHash,
    // This is private release data. Public/admin summaries omit the model contract.
    contract: z.record(z.string(), z.json()),
    games: count,
    updates: count,
    decks: z
      .array(
        z.strictObject({
          key: trainingKey,
          label: z.string().min(1).max(100),
          hash: aiHash,
          archetypes: archetypesSchema,
        }),
      )
      .min(1)
      .max(32),
    evaluations: z.array(aiEvaluationSchema).min(1).max(32),
    datasets: z.array(aiHash).max(10_000).default([]),
    // Private, immutable admission data. Older releases can still be inspected.
    deckSnapshots: z.record(trainingKey, z.json()).optional(),
  })
  .superRefine((release, ctx) => {
    if (
      new Set(release.decks.map(d => d.key)).size !== release.decks.length ||
      release.evaluations.some(
        e =>
          e.interfaceHash !== release.interfaceHash ||
          e.modelHash !== release.artifact.sha256 ||
          e.byDeck.length !== release.decks.length ||
          e.byDeck.some(d => !release.decks.some(deck => deck.key === d.deck)),
      ) ||
      new Set(release.evaluations.map(e => JSON.stringify(e.versions))).size !==
        release.evaluations.length
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid release coverage' });
  });
export type AiRelease = z.infer<typeof aiReleaseSchema>;
export type AiVersions = z.infer<typeof aiVersions>;
export const aiSelectionSchema = z.strictObject({ id: z.uuid(), checksum: aiHash });
export const aiActivationSchema = aiSelectionSchema.extend({
  versions: aiVersions,
  expectedActive: z.uuid().nullable(),
});
export type AiSelection = z.infer<typeof aiSelectionSchema>;
export type AiActivation = z.infer<typeof aiActivationSchema>;
export const aiReleaseIndexSchema = z.strictObject({
  schema: z.literal(1),
  releases: z.array(aiSelectionSchema).max(5000),
});
export type AiReleaseSummary = Omit<
  AiRelease,
  'contract' | 'artifact' | 'datasets' | 'deckSnapshots'
> & {
  playable: boolean;
  checksum: string;
  installed: boolean;
  eligible: boolean;
  compatible: boolean;
};
export type AiReleaseStatus = {
  datasetFailures?: { category: 'history' | 'storage'; count: number }[];
  versions: AiVersions;
  remoteConfigured: boolean;
  inferenceConfigured: boolean;
  remoteError: string | null;
  releases: AiReleaseSummary[];
  active: { leaderCardId: string; target: AiVersions; releaseId: string }[];
  history: { leaderCardId: string; releaseId: string; previousId: string | null; at: string }[];
  datasets: { pending: number; exported: number; revoked: number; failed: number };
};
export type AiReleasePreview = {
  release: AiReleaseSummary;
  current: string | null;
  versions: AiVersions;
  ready: boolean;
  message: string;
};
export const aiConsentSchema = z.strictObject({ allowed: z.boolean(), policy: z.literal(1) });
export type AiConsentStatus = {
  policy: 1;
  allowed: boolean;
  bothAllowed: boolean;
  state: 'waiting' | 'pending' | 'exported' | 'revoked' | 'failed';
};
