import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  boolean,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import type {
  CreatorProfileInput,
  CreationDocument,
  CreationField,
} from '../../../shared/creators/contracts.ts';
import type { TagDimension } from '../../../shared/creators/taxonomy.ts';
const date = (name: string) => timestamp(name, { mode: 'string', withTimezone: true });

export const creatorTag = pgTable(
  'creator_tag',
  {
    id: text('id').primaryKey(),
    dimension: text('dimension').$type<TagDimension>().notNull(),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    description: text('description').notNull(),
    position: integer('position').notNull(),
    parentId: text('parent_id'),
  },
  t => [uniqueIndex('creator_tag_dimension_slug').on(t.dimension, t.slug)],
);
export const creatorProfile = pgTable(
  'creator_profile',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Curated directory profiles can exist before a creator joins SWUBASE.
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    profile: jsonb('profile').$type<CreatorProfileInput>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: date('created_at').notNull().defaultNow(),
    updatedAt: date('updated_at').notNull().defaultNow(),
  },
  t => [index('creator_profile_owner').on(t.ownerId)],
);
export const creatorMember = pgTable(
  'creator_member',
  {
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfile.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  t => [
    primaryKey({ columns: [t.creatorId, t.userId] }),
    index('creator_member_user').on(t.userId),
  ],
);
export const creation = pgTable(
  'creation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    creatorId: uuid('creator_id').references(() => creatorProfile.id, { onDelete: 'cascade' }),
    ownerUserId: text('owner_user_id').references(() => user.id, { onDelete: 'cascade' }),
    ownershipRevision: integer('ownership_revision').notNull().default(1),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    draft: jsonb('draft').$type<CreationDocument>().notNull(),
    published: jsonb('published').$type<CreationDocument>(),
    revision: integer('revision').notNull().default(1),
    publishedRevision: integer('published_revision'),
    sourceVideoId: text('source_video_id').unique(),
    sourceChannelId: text('source_channel_id'),
    sourceDataOrigin: text('source_data_origin').$type<'public' | 'oauth'>(),
    sourceMetadataAt: date('source_metadata_at'),
    sourceCheckedAt: date('source_checked_at'),
    sourceStatus: text('source_status').$type<
      'active' | 'unavailable' | 'expired' | 'authorization_removed'
    >(),
    manuallyEditedFields: jsonb('manually_edited_fields')
      .$type<CreationField[]>()
      .notNull()
      .default([]),
    publishedManuallyEditedFields: jsonb('published_manually_edited_fields')
      .$type<CreationField[]>()
      .notNull()
      .default([]),
    publishedAt: date('published_at'),
    publicUpdatedAt: date('public_updated_at'),
    createdAt: date('created_at').notNull().defaultNow(),
    updatedAt: date('updated_at').notNull().defaultNow(),
  },
  t => [
    index('creation_creator').on(t.creatorId),
    index('creation_personal_owner').on(t.ownerUserId, t.updatedAt, t.id),
    check('creation_one_owner', sql`num_nonnulls(${t.creatorId}, ${t.ownerUserId}) = 1`),
    check(
      'creation_personal_article',
      sql`${t.ownerUserId} IS NULL OR (${t.draft}->>'medium' = 'article' AND (${t.published} IS NULL OR ${t.published}->>'medium' = 'article') AND ${t.sourceVideoId} IS NULL)`,
    ),
    index('creation_publication').on(t.publishedAt, t.id),
    index('creation_youtube_refresh').on(t.sourceCheckedAt, t.id),
  ],
);
// Retry receipts for profile creation and explicit personal-article transfers.
export const creatorPublishingRequest = pgTable(
  'creator_publishing_request',
  {
    id: uuid('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfile.id, { onDelete: 'cascade' }),
    inputHash: text('input_hash').notNull(),
    moved: integer('moved').notNull(),
    createdAt: date('created_at').notNull().defaultNow(),
  },
  t => [
    index('creator_publishing_request_user').on(t.userId),
    index('creator_publishing_request_creator').on(t.creatorId),
  ],
);
export const creationRevision = pgTable(
  'creation_revision',
  {
    creationId: uuid('creation_id')
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    document: jsonb('document').$type<CreationDocument>().notNull(),
    manuallyEditedFields: jsonb('manually_edited_fields')
      .$type<CreationField[]>()
      .notNull()
      .default([]),
    createdAt: date('created_at').notNull().defaultNow(),
  },
  t => [primaryKey({ columns: [t.creationId, t.revision] })],
);
export const creationTag = pgTable(
  'creation_tag',
  {
    creationId: uuid('creation_id')
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => creatorTag.id, { onDelete: 'restrict' }),
  },
  t => [
    primaryKey({ columns: [t.creationId, t.tagId] }),
    index('creation_tag_filter').on(t.tagId, t.creationId),
  ],
);
export const creationReference = pgTable(
  'creation_reference',
  {
    creationId: uuid('creation_id')
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
  },
  t => [
    primaryKey({ columns: [t.creationId, t.entityType, t.entityId] }),
    index('creation_reference_filter').on(t.entityType, t.entityId, t.creationId),
  ],
);
// Public channel identity is independent of OAuth access or creator ownership.
export const creatorYoutubeChannel = pgTable('creator_youtube_channel', {
  channelId: text('channel_id').primaryKey(),
  title: text('title').notNull().default(''),
  avatarUrl: text('avatar_url').notNull().default(''),
  metadataUpdatedAt: date('metadata_updated_at'),
  metadataCheckedAt: date('metadata_checked_at'),
  metadataOrigin: text('metadata_origin').$type<'public' | 'oauth'>(),
  autoImportEnabled: boolean('auto_import_enabled').notNull().default(true),
  lastManualFetchAt: date('last_manual_fetch_at'),
});
export const creatorChannel = pgTable(
  'creator_channel',
  {
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfile.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => creatorYoutubeChannel.channelId, { onDelete: 'cascade' }),
    origin: text('origin').$type<'curated' | 'oauth' | 'public'>().notNull(),
    disconnectedAt: date('disconnected_at'),
    disconnectReason: text('disconnect_reason').$type<'revoked' | 'disconnected' | 'expired'>(),
    sourceUrl: text('source_url'),
    // Direct channel IDs never expire; handles must be resolved regularly.
    resolvedAt: date('resolved_at'),
  },
  t => [
    primaryKey({ columns: [t.creatorId, t.channelId] }),
    index('creator_channel_channel').on(t.channelId),
  ],
);
export const creatorYoutube = pgTable(
  'creator_youtube',
  {
    channelId: text('channel_id')
      .primaryKey()
      .references(() => creatorYoutubeChannel.channelId, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfile.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiresAt: date('expires_at').notNull(),
    connectedAt: date('connected_at').notNull().defaultNow(),
    checkedAt: date('checked_at').notNull().defaultNow(),
    lastCheckAttemptAt: date('last_check_attempt_at'),
  },
  t => [index('creator_youtube_owner').on(t.creatorId)],
);
export const creatorOauthState = pgTable('creator_oauth_state', {
  hash: text('hash').primaryKey(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => creatorProfile.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  verifier: text('verifier').notNull(),
  expiresAt: date('expires_at').notNull(),
});
