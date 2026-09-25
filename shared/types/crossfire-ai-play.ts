import { z } from 'zod';
import { trainingKey, archetypesSchema } from './crossfire-training-roster.ts';
import { aiHash, aiVersions } from './crossfire-ai-releases.ts';

export const aiModelPinSchema = z.strictObject({
  releaseId: z.uuid(),
  artifact: aiHash,
  interfaceHash: aiHash,
  deckKey: trainingKey,
  versions: aiVersions,
});
export type AiModelPin = z.infer<typeof aiModelPinSchema>;
export const createAiGameSchema = z.strictObject({
  requestId: z.uuid(),
  deckId: z.uuid(),
  leaderCardId: z.string().min(1).max(120),
  opponentDeck: trainingKey,
  releaseId: z.uuid(),
});
export const aiOpponentSchema = z.strictObject({
  deckKey: trainingKey,
  label: z.string(),
  leaderCardId: z.string(),
  baseCardId: z.string(),
  archetypes: archetypesSchema,
  releaseId: z.uuid(),
  releaseLabel: z.string(),
  games: z.number(),
});
export type AiOpponent = z.infer<typeof aiOpponentSchema>;
export type AiGameInfo = {
  deckLabel: string;
  releaseLabel: string;
  releaseId: string;
  status: 'ready' | 'retrying';
};
export type AiOpponents = { data: AiOpponent[]; configured: boolean; replayLimit: number | null };
