import { z } from 'zod';
export const cardReleaseVersionSchema = z
  .string()
  .max(40)
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  .refine(value => value.split('.').every(n => Number.isSafeInteger(Number(n))));
export const cardReleaseHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const cardReleaseMetadataSchema = z.strictObject({
  version: cardReleaseVersionSchema,
  checksum: cardReleaseHashSchema,
  requiredEngine: cardReleaseVersionSchema,
  runtimeVersion: cardReleaseVersionSchema,
  runtimeFingerprint: cardReleaseHashSchema,
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
  publishedAt: z.iso.datetime(),
  cards: z.number().int().min(1).max(25_000),
});
export type CardReleaseMetadata = z.infer<typeof cardReleaseMetadataSchema>;
export const cardReleaseIndexSchema = z.strictObject({
  schema: z.literal(1),
  releases: z.array(cardReleaseMetadataSchema).max(5000),
});
export const cardReleaseSelectionSchema = z.strictObject({
  version: cardReleaseVersionSchema,
  checksum: cardReleaseHashSchema,
  source: z.enum(['installed', 'remote']),
});
export const cardReleaseActivationSchema = cardReleaseSelectionSchema.extend({
  expectedActive: cardReleaseVersionSchema,
});
export type CardReleaseSelection = z.infer<typeof cardReleaseSelectionSchema>;
export type CardReleaseRow = {
  version: string;
  checksum: string;
  requiredEngine: string;
  sourceCommit: string;
  createdAt: string;
  installed: boolean;
  compatible: boolean;
};
export type CardReleaseStatus = {
  engineVersion: string;
  activeVersion: string;
  remoteConfigured: boolean;
  remoteError: string | null;
  releases: CardReleaseRow[];
};
export type CardReleasePreview = {
  version: string;
  checksum: string;
  currentVersion: string;
  total: number;
  added: { cardId: string; name: string }[];
  changed: { cardId: string; name: string }[];
  removed: { cardId: string; name: string }[];
};
