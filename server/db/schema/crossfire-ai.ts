import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { crossfireGame, playSchema } from './crossfire.ts';
import { user } from './auth-schema.ts';

const bytes = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });
export const crossfireAiRelease = playSchema.table(
  'ai_releases',
  {
    id: text('id').primaryKey(),
    checksum: text('checksum').notNull(),
    leaderCardId: text('leader_card_id').notNull(),
    manifest: jsonb('manifest').notNull(),
    weights: bytes('weights').notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('ai_releases_leader').on(t.leaderCardId),
    check('ai_weights_size', sql`octet_length(${t.weights}) <= 32000000`),
  ],
);
export const crossfireAiActive = playSchema.table(
  'ai_active',
  {
    leaderCardId: text('leader_card_id').notNull(),
    targetHash: text('target_hash').notNull(),
    target: jsonb('target').notNull(),
    releaseId: text('release_id')
      .notNull()
      .references(() => crossfireAiRelease.id),
    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [primaryKey({ columns: [t.leaderCardId, t.targetHash] })],
);
export const crossfireAiActivation = playSchema.table(
  'ai_activations',
  {
    id: text('id').primaryKey(),
    leaderCardId: text('leader_card_id').notNull(),
    target: jsonb('target').notNull(),
    releaseId: text('release_id')
      .notNull()
      .references(() => crossfireAiRelease.id),
    previousId: text('previous_id').references(() => crossfireAiRelease.id),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('ai_activations_date').on(t.activatedAt)],
);
export const crossfireAiConsent = playSchema.table(
  'ai_training_consents',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    allowed: boolean('allowed').notNull().default(false),
    policy: integer('policy').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.gameId, t.userId] }),
    check('ai_consent_policy', sql`${t.policy} = 1`),
  ],
);
export const crossfireAiExport = playSchema.table(
  'ai_training_exports',
  {
    exportId: text('export_id')
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    // Preserve the cleanup receipt after source deletion so R2 can be revoked.
    gameId: text('game_id')
      .unique()
      .references(() => crossfireGame.id, { onDelete: 'set null' }),
    groupId: text('group_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    purgedAt: timestamp('purged_at', { withTimezone: true }),
    state: text('state').notNull().default('pending'),
    checksum: text('checksum'),
    attempts: integer('attempts').notNull().default(0),
    error: text('error'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('ai_exports_pending').on(t.state, t.updatedAt),
    check('ai_exports_state', sql`${t.state} IN ('pending','exported','revoked','failed')`),
  ],
);

// The bot has an engine seat, never an application user/session identity.
export const crossfireAiGame = playSchema.table(
  'ai_games',
  {
    gameId: text('game_id')
      .primaryKey()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    requestId: text('request_id').notNull(),
    requestHash: text('request_hash').notNull(),
    releaseId: text('release_id')
      .notNull()
      .references(() => crossfireAiRelease.id),
    pin: jsonb('pin').notNull(),
    deckLabel: text('deck_label').notNull(),
    releaseLabel: text('release_label').notNull(),
    replayExpiredAt: timestamp('replay_expired_at', { withTimezone: true }),
    retryAt: timestamp('retry_at', { withTimezone: true }),
  },
  t => [
    index('ai_games_owner').on(t.ownerId),
    index('ai_games_replays')
      .on(t.ownerId)
      .where(sql`${t.replayExpiredAt} IS NULL`),
  ],
);

// Missing row uses the configured default; null explicitly grants unlimited replays.
export const crossfireAiReplayLimit = playSchema.table(
  'ai_replay_limits',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    replayLimit: integer('replay_limit'),
  },
  t => [
    check('ai_replay_limit_nonnegative', sql`${t.replayLimit} IS NULL OR ${t.replayLimit} >= 0`),
  ],
);
