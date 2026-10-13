import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  jsonb,
  index,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import { creatorProfile, creation } from './creator_hub.ts';
import { user } from './auth-schema.ts';
import { deck } from './deck.ts';
import type {
  Analysis,
  JobStatus,
  TokenUsage,
  VideoMetadata,
  WorkerIssue,
} from '../../lib/creators/worker/contracts.ts';

const date = (name: string) => timestamp(name, { mode: 'string', withTimezone: true });
/** Public handle resolution only; no OAuth credentials or assertions about profile ownership. */
export const creatorChannelResolution = pgTable('creator_channel_resolution', {
  url: text('url').primaryKey(),
  channelId: text('channel_id').notNull(),
  resolvedAt: date('resolved_at').notNull().defaultNow(),
});
export const creatorVideoJob = pgTable(
  'creator_video_job',
  {
    videoId: text('video_id').primaryKey(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfile.id, { onDelete: 'cascade' }),
    channelId: text('channel_id').notNull(),
    manuallyRequested: boolean('manually_requested').notNull().default(false),
    status: text('status').$type<JobStatus>().notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: date('available_at').notNull().defaultNow(),
    claimId: uuid('claim_id'),
    leaseUntil: date('lease_until'),
    metadata: jsonb('metadata').$type<VideoMetadata>(),
    metadataFetchedAt: date('metadata_fetched_at'),
    analysis: jsonb('analysis').$type<Analysis>(),
    issues: jsonb('issues').$type<WorkerIssue[]>().notNull().default([]),
    lastError: text('last_error'),
    creationId: uuid('creation_id').references(() => creation.id, { onDelete: 'set null' }),
    createdAt: date('created_at').notNull().defaultNow(),
    updatedAt: date('updated_at').notNull().defaultNow(),
  },
  t => [
    index('creator_video_job_queue').on(t.status, t.availableAt),
    index('creator_video_job_creator').on(t.creatorId),
  ],
);

// Deliberately no FK: deleting a profile/job must never reset the spending allowance.
export const creatorVideoSpend = pgTable('creator_video_spend', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: text('video_id').notNull(),
  model: text('model').notNull(),
  reservedMicros: integer('reserved_micros').notNull(),
  chargedMicros: integer('charged_micros'),
  usage: jsonb('usage').$type<TokenUsage>(),
  createdAt: date('created_at').notNull().defaultNow(),
});

// A deleted/privatized imported deck remains a tombstone; retries cannot republish it.
export const creatorImportedDeck = pgTable(
  'creator_imported_deck',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    sourceDeckId: text('source_deck_id').notNull(),
    deckId: uuid('deck_id').references(() => deck.id, { onDelete: 'set null' }),
    pendingPublication: boolean('pending_publication').notNull().default(false),
  },
  t => [
    primaryKey({ columns: [t.userId, t.source, t.sourceDeckId] }),
    index('creator_imported_deck_deck').on(t.deckId),
  ],
);
