import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export const userCalendarSubscription = pgTable('user_calendar_subscription', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  // A fresh ID revokes the previous signed URL. No bearer secret is stored in the database.
  id: uuid('id').notNull().defaultRandom().unique(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
});
