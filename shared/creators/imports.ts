import { z } from 'zod';
import { creatorProfileSchema } from './contracts.ts';
import { directoryChannelIds, youtubeVideoId } from './youtube.ts';

export const MAX_CREATOR_IMPORT_BYTES = 5 * 1024 * 1024;

// Keep research files portable: no database IDs, ownership, credentials, or publication state.
export const importedCreatorSchema = creatorProfileSchema
  .omit({ bio: true })
  .extend({ bio: z.string().max(10_000).default('') })
  .strict()
  .superRefine((profile, ctx) => {
    const channels = directoryChannelIds(profile.links);
    if (!channels.length)
      ctx.addIssue({
        code: 'custom',
        path: ['links'],
        message: 'Add a canonical YouTube channel URL: https://www.youtube.com/channel/UC…',
      });
    if (new Set(channels).size !== channels.length)
      ctx.addIssue({
        code: 'custom',
        path: ['links'],
        message: 'Each YouTube channel should appear only once.',
      });
    profile.links.forEach((link, i) => {
      let hostname: string;
      try {
        hostname = new URL(link.url).hostname;
      } catch {
        return;
      }
      if (
        ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname) &&
        !directoryChannelIds([link]).length &&
        !youtubeVideoId(link.url)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['links', i, 'url'],
          message: 'Resolve YouTube handles to canonical /channel/UC… URLs before importing.',
        });
    });
  });

export const creatorImportSchema = z
  .object({
    kind: z.literal('swubase-creator-import'),
    schemaVersion: z.literal(1),
    creators: z.array(importedCreatorSchema).max(200).default([]),
    videos: z
      .array(
        z
          .object({
            videoId: z.string().regex(/^[\w-]{11}$/, 'Use the 11-character YouTube video ID.'),
            channelId: z.string().regex(/^UC[\w-]{22}$/, 'Use the canonical YouTube channel ID.'),
          })
          .strict(),
      )
      .max(5000)
      .default([]),
  })
  .strict()
  .superRefine((input, ctx) => {
    // Defaults and normalized strings are sent over the wire; bound that representation too.
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > MAX_CREATOR_IMPORT_BYTES)
      ctx.addIssue({
        code: 'custom',
        message: 'The normalized import exceeds 5 MiB. Split it into smaller files.',
      });
    if (!input.creators.length && !input.videos.length)
      ctx.addIssue({ code: 'custom', message: 'Include at least one creator or video.' });
    for (const [field, values] of [
      ['creators', input.creators.map(p => p.slug)],
      ['creators', input.creators.flatMap(p => directoryChannelIds(p.links))],
      ['videos', input.videos.map(v => v.videoId)],
    ] as const) {
      if (new Set(values).size !== values.length)
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Remove duplicate creator addresses, channels, or video IDs.',
        });
    }
  });
export type CreatorImport = z.infer<typeof creatorImportSchema>;
export type ImportedCreator = z.infer<typeof importedCreatorSchema>;
export const creatorImportApplySchema = z
  .object({
    payload: creatorImportSchema,
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type CreatorImportRow = {
  key: string;
  label: string;
  status: 'insert' | 'queue' | 'skip' | 'conflict';
  reason: string;
};
export type CreatorImportPreview = {
  fingerprint: string;
  creators: CreatorImportRow[];
  videos: CreatorImportRow[];
  summary: { profiles: number; queued: number; skipped: number; conflicts: number };
};
export type CreatorImportResult = { profiles: number; queued: number; skipped: number };
