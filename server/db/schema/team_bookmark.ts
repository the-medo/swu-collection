import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { team } from './team.ts';

export const teamBookmark = pgTable(
  'team_bookmark',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 100 }).notNull(),
    url: text('url').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => [index('team_bookmark_team_created_idx').on(table.teamId, table.createdAt)],
);
