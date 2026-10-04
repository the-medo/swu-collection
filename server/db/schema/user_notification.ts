import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import type { NotificationType } from '../../../shared/types/notifications.ts';

export const userNotification = pgTable(
  'user_notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 80 }).$type<NotificationType>().notNull(),
    entityType: varchar('entity_type', { length: 40 }).notNull(),
    entityId: text('entity_id').notNull(),
    data: jsonb('data').$type<{ version: 1 }>().notNull().default({ version: 1 }),
    dedupeKey: text('dedupe_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    firstReadAt: timestamp('first_read_at', { withTimezone: true, mode: 'string' }),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
  },
  table => [
    uniqueIndex('user_notification_dedupe_idx').on(table.recipientUserId, table.dedupeKey),
    index('user_notification_inbox_idx').on(
      table.recipientUserId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('user_notification_unread_idx')
      .on(table.recipientUserId, table.createdAt.desc(), table.id.desc())
      .where(sql`${table.readAt} IS NULL AND ${table.archivedAt} IS NULL`),
    index('user_notification_entity_idx').on(table.entityType, table.entityId),
    index('user_notification_actor_idx').on(table.actorUserId),
  ],
);
