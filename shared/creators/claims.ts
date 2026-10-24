import { z } from 'zod';
import { creatorProfileSchema } from './contracts.ts';

export const youtubeClaimStartSchema = z.object({ creatorId: z.uuid().optional() });
export const youtubeClaimIdSchema = z.object({ claimId: z.string().regex(/^[\w-]{43}$/) });
export const youtubeClaimChoiceSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    name: creatorProfileSchema.shape.name,
    slug: creatorProfileSchema.shape.slug,
  }),
  z.object({ action: z.literal('connect'), creatorId: z.uuid() }),
]);
export type YoutubeClaimChoice = z.infer<typeof youtubeClaimChoiceSchema>;
export type YoutubeClaimPreview = {
  channel: { id: string; title: string; avatarUrl: string };
  suggestedSlug: string;
  profiles: { id: string; name: string }[];
  expiresAt: string;
};
export type YoutubeConnectionResult = {
  creatorId: string;
  channelId: string;
  claimed: boolean;
  transferredDecks: number;
};
export type YoutubeCallbackResult = YoutubeConnectionResult | { claimId: string };
