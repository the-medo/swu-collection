import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export const directConversation = pgTable(
  'direct_conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userOneId: text('user_one_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userTwoId: text('user_two_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastSequence: integer('last_sequence').notNull().default(0),
    userOneReadSequence: integer('user_one_read_sequence').notNull().default(0),
    userTwoReadSequence: integer('user_two_read_sequence').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  table => [
    uniqueIndex('direct_conversation_pair_idx').on(table.userOneId, table.userTwoId),
    check(
      'direct_conversation_order_check',
      sql`${table.userOneId} COLLATE "C" < ${table.userTwoId} COLLATE "C"`,
    ),
    check(
      'direct_conversation_read_check',
      sql`${table.userOneReadSequence} BETWEEN 0 AND ${table.lastSequence} AND ${table.userTwoReadSequence} BETWEEN 0 AND ${table.lastSequence}`,
    ),
    index('direct_conversation_user_one_idx').on(
      table.userOneId,
      table.lastMessageAt.desc(),
      table.id.desc(),
    ),
    index('direct_conversation_user_two_idx').on(
      table.userTwoId,
      table.lastMessageAt.desc(),
      table.id.desc(),
    ),
  ],
);

export const directMessage = pgTable(
  'direct_message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => directConversation.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientMessageId: uuid('client_message_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  table => [
    uniqueIndex('direct_message_sequence_idx').on(table.conversationId, table.sequence),
    uniqueIndex('direct_message_retry_idx').on(table.senderId, table.clientMessageId),
    index('direct_message_sender_time_idx').on(table.senderId, table.createdAt),
    check('direct_message_body_check', sql`char_length(${table.body}) BETWEEN 1 AND 5000`),
    check('direct_message_sequence_check', sql`${table.sequence} > 0`),
  ],
);
