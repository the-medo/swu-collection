import { z } from 'zod';
import { getArtistKey, isArtistLinkUrl } from '../lib/artists.ts';

export const MAX_ARTIST_EXPORT_BYTES = 10 * 1024 * 1024;
const linkSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    url: z.string().trim().max(2048).refine(isArtistLinkUrl, 'Expected a public HTTP(S) link'),
  })
  .strict();
export const artistProfileSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(255)
      .refine(key => key === getArtistKey(key), 'Artist key must be normalized'),
    name: z.string().trim().min(1).max(255),
    biography: z.string().max(20000).nullable(),
    links: z
      .array(linkSchema)
      .max(50)
      .superRefine((links, context) => {
        if (new Set(links.map(link => link.url)).size !== links.length) {
          context.addIssue({ code: 'custom', message: 'Duplicate link URLs' });
        }
      }),
  })
  .strict();

const exportFields = {
  format: z.literal('swubase-artist-profiles'),
  exportedAt: z.iso.datetime(),
  artists: z.array(artistProfileSchema).max(5000),
};
const aliasSchema = z
  .object({
    key: artistProfileSchema.shape.key,
    canonicalKey: artistProfileSchema.shape.key,
  })
  .strict();

export function validateArtistAliases(
  aliases: { key: string; canonicalKey: string }[],
  profileKeys: Set<string>,
) {
  const keys = new Set(aliases.map(alias => alias.key));
  if (keys.size !== aliases.length) throw new Error('Duplicate artist alias keys');
  for (const alias of aliases) {
    if (!profileKeys.has(alias.key) || !profileKeys.has(alias.canonicalKey))
      throw new Error(`Missing profile for artist alias "${alias.key}"`);
    if (keys.has(alias.canonicalKey))
      throw new Error(
        `Artist alias "${alias.key}" must target a canonical profile, not another alias`,
      );
  }
}

export const artistExportSchema = z
  .discriminatedUnion('version', [
    z.object({ ...exportFields, version: z.literal(1) }).strict(),
    z
      .object({ ...exportFields, version: z.literal(2), aliases: z.array(aliasSchema).max(5000) })
      .strict(),
  ])
  .superRefine((data, context) => {
    if (new Set(data.artists.map(profile => profile.key)).size !== data.artists.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate artist keys' });
    }
    if (data.version === 2) {
      try {
        validateArtistAliases(data.aliases, new Set(data.artists.map(profile => profile.key)));
      } catch (error) {
        context.addIssue({ code: 'custom', message: (error as Error).message });
      }
    }
  });

export type ArtistExport = z.infer<typeof artistExportSchema>;
export type ArtistProfileData = ArtistExport['artists'][number];
export type ArtistImportMode = 'merge' | 'replace';

export const artistSnapshotKeySchema = z
  .string()
  .max(240)
  .regex(/^artist-profiles\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/)
  .refine(key => !key.includes('..'), 'Invalid snapshot key');
export const artistTransferSourceSchema = z
  .object({ kind: z.literal('r2'), key: artistSnapshotKeySchema })
  .strict();
export const artistTransferPreviewSchema = z
  .object({
    source: artistTransferSourceSchema,
    mode: z.enum(['merge', 'replace']),
  })
  .strict();
export const artistTransferApplySchema = artistTransferPreviewSchema
  .extend({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    expectedState: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type ArtistTransferPreviewInput = z.infer<typeof artistTransferPreviewSchema>;
export type ArtistTransferApplyInput = z.infer<typeof artistTransferApplySchema>;
export type ArtistSnapshot = { key: string; uploadedAt: string; bytes: number };
export type ArtistTransferSummary = { profiles: number; links: number; aliases: number };
export type ArtistTransferStatus = {
  database: ArtistTransferSummary;
  storage: { configured: boolean; bucket: string | null };
};
export type ArtistTransferChanges = {
  changes: { key: string; action: 'create' | 'update' | 'unchanged'; links: number }[];
  aliasChanges: { key: string; canonicalKey: string | null }[];
};
export type ArtistTransferPreview = ArtistTransferPreviewInput &
  ArtistTransferChanges & {
    sha256: string;
    expectedState: string;
    exportedAt: string;
    summary: ArtistTransferSummary;
  };
