import { z } from 'zod';
import { postDocumentSchemas, type PostDocument } from '../posts/content.ts';
import { isKnownTagId, normalizeTagIds, type CreationTag } from './taxonomy.ts';

export const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine(value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Use an HTTPS URL without credentials.');
const optionalUrl = z.union([safeUrl, z.literal('')]).default('');
export const languageSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .refine(value => {
    try {
      return Intl.getCanonicalLocales(value).length === 1;
    } catch {
      return false;
    }
  }, 'Use a language code such as en, fr, or pt-BR.')
  .transform(value => Intl.getCanonicalLocales(value)[0]);
const tagId = z.string().refine(isKnownTagId, 'Unknown classification.');
export const creatorProfileSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine(
      value => !['studio', 'new', 'youtube', 'tags', 'mine', 'search'].includes(value),
      'This address is reserved.',
    ),
  name: z.string().trim().min(1).max(100),
  tagline: z.string().trim().max(240).default(''),
  bio: postDocumentSchemas.simple,
  avatarUrl: optionalUrl,
  bannerUrl: optionalUrl,
  languages: z
    .array(languageSchema)
    .min(1)
    .max(10)
    .transform(codes => [...new Set(codes)]),
  // Leave room for both former parent tags to expand without invalidating saved profiles.
  specialties: z
    .array(tagId)
    .max(22)
    .transform(normalizeTagIds)
    .pipe(z.array(z.string()).max(22, 'Choose up to 22 specialties.')),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        url: safeUrl,
        kind: z.enum(['social', 'website', 'support', 'contact']).default('social'),
      }),
    )
    .max(20),
  introduction: z.string().trim().max(2000).default(''),
});
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;
export type CreatorProfile = CreatorProfileInput & {
  id: string;
  ownerId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  youtube: { channelId: string; title: string }[];
};
export type CreatorYoutubeStatus = {
  configured: boolean;
  fetchingConfigured: boolean;
  channels: {
    channelId: string;
    title: string;
    avatarUrl: string;
    connectedAt: string | null;
    connected: boolean;
    disconnectedAt: string | null;
    disconnectReason: 'revoked' | 'disconnected' | 'expired' | null;
    autoImportEnabled: boolean;
    lastManualFetchAt: string | null;
  }[];
};
export const youtubeChannelSchema = z.object({ channelId: z.string().regex(/^UC[\w-]{22}$/) });
export const youtubeImportSettingsSchema = youtubeChannelSchema.extend({
  autoImportEnabled: z.boolean(),
});
export type CreatorChannelFetchResult = { enqueued: number; incomplete: boolean };
export const CHANNEL_FETCH_COOLDOWN_MS = 5 * 60_000;
export const entityTypes = ['card', 'leader', 'base', 'deck', 'tournament', 'set'] as const;
export const entityReferenceSchema = z.object({
  type: z.enum(entityTypes),
  id: z.string().trim().min(1).max(255),
  startSeconds: z.number().int().min(0).max(604800).nullable().default(null),
});
export type EntityReference = z.infer<typeof entityReferenceSchema>;
export const creationDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().max(1000).default(''),
    videoDescription: z.string().max(20_000).default(''),
    medium: z.enum(['article', 'video', 'audio', 'external']),
    body: postDocumentSchemas.rich,
    coverUrl: optionalUrl,
    sourceUrl: optionalUrl,
    language: languageSchema.default('en'),
    tags: z
      .array(tagId)
      .max(42)
      .refine(ids => ids.every(id => !id.startsWith('medium:')), 'Medium is selected separately.')
      .refine(ids => new Set(ids).size === ids.length, 'Remove duplicate classifications.')
      .transform(normalizeTagIds)
      .pipe(z.array(z.string()).max(42, 'Choose up to 42 classifications.')),
    references: z.array(entityReferenceSchema).max(50),
    chapters: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(120),
          startSeconds: z.number().int().min(0).max(604800),
        }),
      )
      .max(100),
    relevance: z.enum(['primary', 'partial']).default('primary'),
    freshness: z.enum(['current', 'historical']).default('current'),
    season: z.string().trim().max(100).default(''),
    sponsorship: z.string().trim().max(500).default(''),
    series: z.string().trim().max(100).default(''),
    seriesOrder: z.number().int().min(0).max(10000).default(0),
    pinned: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.medium !== 'article' && !data.sourceUrl)
      ctx.addIssue({
        code: 'custom',
        path: ['sourceUrl'],
        message: 'Add the original content URL.',
      });
    if (new Set(data.tags).size !== data.tags.length)
      ctx.addIssue({
        code: 'custom',
        path: ['tags'],
        message: 'Remove duplicate classifications.',
      });
    if (data.chapters.some((c, i) => i > 0 && c.startSeconds <= data.chapters[i - 1].startSeconds))
      ctx.addIssue({
        code: 'custom',
        path: ['chapters'],
        message: 'Chapter timestamps must increase.',
      });
  });
export type CreationDocument = z.infer<typeof creationDocumentSchema>;
export type CreationField = keyof CreationDocument;
export type Creation = {
  id: string;
  creatorId: string;
  authorId: string | null;
  revision: number;
  document: CreationDocument;
  sourceVerified: boolean;
  publishedAt: string | null;
  updatedAt: string;
  hasUnpublishedChanges?: boolean;
  manuallyEditedFields?: CreationField[];
  sourceStatus?: 'active' | 'unavailable' | 'expired' | 'authorization_removed' | null;
  creator: { slug: string; name: string; avatarUrl: string };
  references?: (EntityReference & { label: string; href: string })[];
};
export const discoverySchema = z.object({
  q: z.string().trim().max(120).optional(),
  tags: z.string().max(2000).optional(),
  language: languageSchema.optional(),
  creatorId: z.uuid().optional(),
  entityType: z.enum(entityTypes).optional(),
  entityId: z.string().max(255).optional(),
  freshness: z.enum(['current', 'historical']).optional(),
  series: z.string().trim().max(100).optional(),
  after: z.iso.date().optional(),
  before: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(24),
});
export type DiscoveryQuery = Omit<z.infer<typeof discoverySchema>, 'limit'> & { limit?: number };
export type CreationSummary = Omit<Creation, 'document' | 'references'> & {
  document: Pick<
    CreationDocument,
    | 'title'
    | 'summary'
    | 'medium'
    | 'coverUrl'
    | 'language'
    | 'tags'
    | 'freshness'
    | 'pinned'
    | 'series'
    | 'seriesOrder'
  >;
};
export type CreationList = { items: CreationSummary[]; hasMore: boolean };
export type DiscoveryResult = CreationList & {
  languages: string[];
  subject?: Pick<EntityReference, 'type' | 'id'> & { label: string };
};
export type CreatorDirectoryResult = {
  items: CreatorProfile[];
  hasMore: boolean;
  languages: string[];
};
export type CreatorTaxonomy = CreationTag[];
export type CreatorRevision = { revision: number; createdAt: string; document: CreationDocument };
export type { PostDocument };
