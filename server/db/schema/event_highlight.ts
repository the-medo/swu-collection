import { pgTable, uuid, date, text, timestamp, index } from 'drizzle-orm/pg-core';

export const eventHighlight = pgTable(
  'event_highlight',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date', { mode: 'string' }).notNull(),
    imageUrl: text('image_url').notNull(),
    description: text('description').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => [index('event_highlight_date_idx').on(table.date)],
);
