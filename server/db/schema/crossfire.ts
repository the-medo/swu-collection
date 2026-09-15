import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Private authoritative storage. No account/deck cascade may delete a game.
export const playSchema = pgSchema('play');
export const crossfireGame = playSchema.table(
  'games',
  {
    id: text('id').primaryKey(),
    versions: jsonb('versions').notNull(),
    sequence: integer('sequence').notNull().default(0),
    revision: integer('revision').notNull(),
    stateHash: text('state_hash').notNull(),
    historyKey: text('history_key')
      .notNull()
      .default(sql`gen_random_uuid()::text`),
    status: text('status').notNull().default('running'),
    summary: jsonb('summary'),
    provenance: jsonb('provenance'),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    statisticsAt: timestamp('statistics_at', { withTimezone: true, mode: 'string' }),
    ownerId: text('owner_id'),
    fence: integer('fence').notNull().default(0),
    leaseUntil: timestamp('lease_until', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('games_finalization').on(t.status, t.updatedAt),
    index('games_statistics_pending')
      .on(t.updatedAt)
      .where(sql`${t.status} = 'finalized' AND ${t.statisticsAt} IS NULL`),
    check('games_status', sql`${t.status} IN ('running', 'ended', 'finalized', 'abandoned')`),
    check('games_counters', sql`${t.sequence} >= 0 AND ${t.revision} >= 0 AND ${t.fence} >= 0`),
    check('games_owner_lease', sql`(${t.ownerId} IS NULL) = (${t.leaseUntil} IS NULL)`),
  ],
);

// Each accepted command and its server random inputs share one durable receipt.
export const crossfireJournal = playSchema.table(
  'journal_live',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    actorId: text('actor_id').notNull(),
    commandId: text('command_id').notNull(),
    requestHash: text('request_hash').notNull(),
    fromRevision: integer('from_revision').notNull(),
    revision: integer('revision').notNull(),
    stateHash: text('state_hash').notNull(),
    inputs: jsonb('inputs').notNull(),
    facts: jsonb('facts').notNull(),
    timeline: jsonb('timeline'),
    control: jsonb('control'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.gameId, t.sequence] }),
    uniqueIndex('journal_command_receipt').on(t.gameId, t.actorId, t.commandId),
    check(
      'journal_counters',
      sql`${t.sequence} > 0 AND ${t.fromRevision} >= 0 AND ${t.revision} > ${t.fromRevision}`,
    ),
  ],
);

const bytes = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});
export const crossfireJournalHistory = playSchema.table(
  'journal_history',
  {
    gameId: text('game_id')
      .primaryKey()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    format: integer('format').notNull(),
    sequence: integer('sequence').notNull(),
    stateHash: text('state_hash').notNull(),
    payloadHash: text('payload_hash').notNull(),
    rawBytes: integer('raw_bytes').notNull(),
    payload: bytes('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    check('journal_history_format', sql`${t.format} = 1`),
    check(
      'journal_history_size',
      sql`${t.rawBytes} > 0 AND ${t.rawBytes} <= 67108864 AND octet_length(${t.payload}) <= 8388608`,
    ),
  ],
);

export const crossfireCheckpoint = playSchema.table(
  'checkpoints',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    revision: integer('revision').notNull(),
    stateHash: text('state_hash').notNull(),
    // Preserve the executable's encoding and record iteration order during recovery.
    checkpoint: text('checkpoint').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.gameId, t.sequence] }),
    check('checkpoints_counters', sql`${t.sequence} >= 0 AND ${t.revision} >= 0`),
    check('checkpoints_size', sql`octet_length(${t.checkpoint}) <= 8388608`),
  ],
);

export const crossfireLobby = playSchema.table(
  'lobbies',
  {
    id: text('id').primaryKey(),
    creatorUserId: text('creator_user_id').references(() => user.id, { onDelete: 'set null' }),
    gameId: text('game_id')
      .unique()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('waiting'),
    bestOf: integer('best_of').notNull().default(1),
    showLeader: boolean('show_leader').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now() + interval '3 minutes'`),
    versions: jsonb('versions').notNull(),
    allowSpectators: boolean('allow_spectators').notNull().default(false),
    handsToPlayers: boolean('hands_to_players').notNull().default(false),
    handsToSpectators: boolean('hands_to_spectators').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    check('lobbies_best_of', sql`${t.bestOf} IN (1, 3)`),
    check('lobbies_status', sql`${t.status} IN ('waiting', 'started', 'cancelled', 'expired')`),
    index('lobbies_waiting_expiry')
      .on(t.expiresAt)
      .where(sql`${t.status} = 'waiting'`),
    check('lobbies_game_status', sql`(${t.status} = 'started') = (${t.gameId} IS NOT NULL)`),
  ],
);
export const crossfireInvitation = playSchema.table(
  'invitations',
  {
    lobbyId: text('lobby_id')
      .primaryKey()
      .references(() => crossfireLobby.id, { onDelete: 'cascade' }),
    // Keep the directed-invitation marker even if the recipient deletes their account.
    recipientUserId: text('recipient_user_id').references(() => user.id, { onDelete: 'set null' }),
  },
  t => [index('invitations_recipient').on(t.recipientUserId)],
);
export const crossfireParticipant = playSchema.table(
  'participants',
  {
    lobbyId: text('lobby_id')
      .notNull()
      .references(() => crossfireLobby.id, { onDelete: 'cascade' }),
    seat: text('seat').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    // Soft session reference: session TRUNCATE/delete must remain independent.
    // Admission explicitly checks the live session row; its absence revokes access.
    sessionId: text('session_id').notNull(),
    connectionEpoch: integer('connection_epoch').notNull().default(0),
    deckSnapshot: jsonb('deck_snapshot').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.lobbyId, t.seat] }),
    uniqueIndex('participants_one_seat_per_user').on(t.lobbyId, t.userId),
    check('participants_seat', sql`${t.seat} IN ('p1', 'p2')`),
    check('participants_connection_epoch', sql`${t.connectionEpoch} >= 0`),
  ],
);

export const crossfireConnectionTicket = playSchema.table(
  'connection_tickets',
  {
    tokenHash: text('token_hash').primaryKey(),
    lobbyId: text('lobby_id')
      .notNull()
      .references(() => crossfireLobby.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    sessionId: text('session_id').notNull(),
    role: text('role').notNull(),
    purpose: text('purpose').notNull().default('live'),
    seat: text('seat'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('connection_tickets_expiration').on(t.expiresAt),
    check('connection_tickets_purpose', sql`${t.purpose} IN ('live', 'replay')`),
    check('connection_tickets_hash', sql`${t.tokenHash} ~ '^[a-f0-9]{64}$'`),
    check(
      'connection_tickets_role_seat',
      sql`(${t.role} = 'player' AND ${t.seat} IS NOT NULL AND ${t.seat} IN ('p1', 'p2'))
        OR (${t.role} = 'spectator' AND ${t.seat} IS NULL)`,
    ),
  ],
);

export const crossfireUndoRequest = playSchema.table(
  'undo_requests',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    requester: text('requester').notNull(),
    sequence: integer('sequence').notNull(),
    stateHash: text('state_hash').notNull(),
    target: integer('target').notNull(),
    targetHash: text('target_hash').notNull(),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('undo_requests_game').on(t.gameId),
    uniqueIndex('undo_requests_pending')
      .on(t.gameId)
      .where(sql`${t.status} = 'pending'`),
    check(
      'undo_requests_status',
      sql`${t.status} IN ('pending','accepted','declined','cancelled','expired')`,
    ),
    check('undo_requests_seat', sql`${t.requester} IN ('p1','p2')`),
    check('undo_requests_position', sql`${t.target} >= 0 AND ${t.target} < ${t.sequence}`),
  ],
);

export const crossfireBookmark = playSchema.table(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    branch: text('branch').notNull(),
    label: text('label').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('bookmarks_owner').on(t.userId, t.createdAt),
    index('bookmarks_game').on(t.gameId),
    check(
      'bookmarks_handles',
      sql`${t.position} ~ '^[a-f0-9]{32}$' AND ${t.branch} ~ '^[a-f0-9]{32}$'`,
    ),
    check('bookmarks_label', sql`length(${t.label}) <= 120`),
  ],
);

export const crossfirePracticeRequest = playSchema.table(
  'practice_requests',
  {
    id: text('id').primaryKey(),
    sourceGameId: text('source_game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    requesterId: text('requester_id').references(() => user.id, { onDelete: 'cascade' }),
    opponentId: text('opponent_id').references(() => user.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    branch: text('branch').notNull(),
    label: text('label').notNull(),
    gameId: text('game_id').notNull().unique(),
    lobbyId: text('lobby_id').notNull().unique(),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('practice_requests_requester').on(t.requesterId),
    index('practice_requests_opponent').on(t.opponentId),
    check('practice_requests_status', sql`${t.status} IN ('pending','accepted','declined')`),
    check(
      'practice_requests_handles',
      sql`${t.position} ~ '^[a-f0-9]{32}$' AND ${t.branch} ~ '^[a-f0-9]{32}$'`,
    ),
  ],
);

export const crossfireChatMessage = playSchema.table(
  'chat_messages',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    id: text('id').notNull(),
    seat: text('seat').notNull(),
    text: text('text').notNull(),
    afterEvent: integer('after_event'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.gameId, t.sequence] }),
    uniqueIndex('chat_messages_receipt').on(t.gameId, t.id),
    check('chat_messages_sequence', sql`${t.sequence} > 0 AND ${t.sequence} <= 500`),
    check('chat_messages_seat', sql`${t.seat} IN ('p1','p2')`),
    check('chat_messages_text', sql`length(${t.text}) BETWEEN 1 AND 1000`),
    check('chat_messages_after_event', sql`${t.afterEvent} IS NULL OR ${t.afterEvent} >= 0`),
  ],
);

export const crossfireProblemReport = playSchema.table(
  'problem_reports',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    branch: text('branch').notNull(),
    label: text('label').notNull(),
    description: text('description').notNull(),
    // Gzipped authoritative checkpoint stays server-only. The browser receives
    // only the reporter's separately captured permitted view.
    checkpoint: bytes('checkpoint'),
    checkpointHash: text('checkpoint_hash'),
    snapshot: jsonb('snapshot'),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('problem_reports_owner').on(t.userId, t.createdAt),
    index('problem_reports_status').on(t.status, t.createdAt),
    check('problem_reports_status', sql`${t.status} IN ('open','resolved')`),
    check(
      'problem_reports_snapshot',
      sql`(${t.checkpoint} IS NULL AND ${t.checkpointHash} IS NULL AND ${t.snapshot} IS NULL) OR (${t.checkpoint} IS NOT NULL AND octet_length(${t.checkpoint}) <= 8388608 AND ${t.checkpointHash} IS NOT NULL AND ${t.checkpointHash} ~ '^[a-f0-9]{64}$' AND ${t.snapshot} IS NOT NULL AND octet_length(${t.snapshot}::text) <= 8388608)`,
    ),
    check(
      'problem_reports_text',
      sql`length(${t.label}) <= 120 AND length(${t.description}) BETWEEN 10 AND 3000`,
    ),
    check(
      'problem_reports_handles',
      sql`${t.position} ~ '^[a-f0-9]{32}$' AND ${t.branch} ~ '^[a-f0-9]{32}$'`,
    ),
  ],
);

export const crossfireReportNotification = playSchema.table(
  'report_notifications',
  {
    reportId: text('report_id')
      .primaryKey()
      .references(() => crossfireProblemReport.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    leaseId: text('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true, mode: 'string' }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    channelId: text('channel_id'),
    appBaseUrl: text('app_base_url'),
    messageId: text('message_id'),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'string' }),
  },
  t => [
    index('report_notifications_due').on(t.status, t.nextAttemptAt),
    check('report_notifications_status', sql`${t.status} IN ('pending','sending','sent')`),
    check('report_notifications_attempts', sql`${t.attempts} >= 0`),
    check(
      'report_notifications_lease',
      sql`(${t.status} = 'sending') = (${t.leaseId} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL)`,
    ),
  ],
);

// A match coordinates independent games; authoritative state stays in games/history.
export const crossfireMatch = playSchema.table('matches', {
  id: text('id')
    .primaryKey()
    .references(() => crossfireLobby.id, { onDelete: 'cascade' }),
  rematchLobbyId: text('rematch_lobby_id').references(() => crossfireLobby.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
export const crossfireMatchGame = playSchema.table(
  'match_games',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => crossfireMatch.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    initiativeChooser: text('initiative_chooser').notNull(),
    lobbyId: text('lobby_id')
      .notNull()
      .references(() => crossfireLobby.id, { onDelete: 'cascade' }),
  },
  t => [
    primaryKey({ columns: [t.matchId, t.number] }),
    uniqueIndex('match_games_lobby').on(t.lobbyId),
    check('match_games_chooser', sql`${t.initiativeChooser} IN ('p1', 'p2')`),
    check('match_games_number', sql`${t.number} > 0`),
  ],
);
export const crossfireMatchReadiness = playSchema.table(
  'match_readiness',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => crossfireMatch.id, { onDelete: 'cascade' }),
    afterLobbyId: text('after_lobby_id')
      .notNull()
      .references(() => crossfireLobby.id, { onDelete: 'cascade' }),
    seat: text('seat').notNull(),
    kind: text('kind').notNull(),
    sessionId: text('session_id').notNull(),
    deckSnapshot: jsonb('deck_snapshot').notNull(),
  },
  t => [
    primaryKey({ columns: [t.matchId, t.afterLobbyId, t.seat, t.kind] }),
    check('match_readiness_seat', sql`${t.seat} IN ('p1', 'p2')`),
    check('match_readiness_kind', sql`${t.kind} IN ('next', 'rematch')`),
  ],
);

// A durable account-authorized match exit. Pending requests survive worker restarts.
export const crossfireMatchExit = playSchema.table(
  'match_exits',
  {
    matchId: text('match_id')
      .primaryKey()
      .references(() => crossfireMatch.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => crossfireGame.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull().unique(),
    seat: text('seat').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
  },
  t => [
    check('match_exits_seat', sql`${t.seat} IN ('p1', 'p2')`),
    check('match_exits_status', sql`${t.status} IN ('pending', 'forfeit', 'abandoned')`),
    check('match_exits_closed', sql`(${t.status} = 'pending') = (${t.closedAt} IS NULL)`),
    index('match_exits_pending')
      .on(t.createdAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

// Installed card data is immutable and shared by matches/replays through its pin.
export const crossfireCardBundle = playSchema.table(
  'card_bundles',
  {
    version: text('version').primaryKey(),
    checksum: text('checksum').notNull(),
    requiredEngine: text('required_engine').notNull(),
    r2Key: text('r2_key'),
    definitions: jsonb('definitions').notNull(),
    sourceCommit: text('source_commit').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    uniqueIndex('card_bundles_checksum').on(t.checksum),
    check('card_bundle_checksum', sql`${t.checksum} ~ '^[a-f0-9]{64}$'`),
  ],
);
