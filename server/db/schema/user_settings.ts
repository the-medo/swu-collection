import { pgTable, text, varchar, primaryKey } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export const userSettings = pgTable(
  'user_settings',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 255 }).notNull(),
    value: text('value').notNull(),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.userId, table.key] }),
    };
  },
);

export const userSettingsSchema = {
  userSettings,
};
