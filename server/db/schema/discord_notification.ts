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
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const discordNotification = pgTable(
  'discord_notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationType: varchar('notification_type', { length: 120 }).notNull(),
    scopeType: varchar('scope_type', { length: 80 }).notNull(),
    scopeId: text('scope_id'),
    scopeKey: text('scope_key').notNull(),
    discordChannelId: text('discord_channel_id').notNull(),
    discordMessageId: text('discord_message_id'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    error: text('error'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    sentAt: timestamp('sent_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    notificationScopeIdx: uniqueIndex('discord_notification_scope_uidx').on(
      table.notificationType,
      table.scopeKey,
    ),
    scopeIdx: index('discord_notification_scope_idx').on(table.scopeType, table.scopeId),
    statusIdx: index('discord_notification_status_idx').on(table.status),
    sentAtIdx: index('discord_notification_sent_at_idx').on(table.sentAt),
  }),
);

export type DiscordNotification = InferSelectModel<typeof discordNotification>;
export type DiscordNotificationInsert = InferInsertModel<typeof discordNotification>;
