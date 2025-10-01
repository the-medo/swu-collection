import { pgTable, varchar, integer, index, serial } from 'drizzle-orm/pg-core';
import { format } from './format.ts';
import type { InferSelectModel } from 'drizzle-orm';

// Tournament Schema
export const meta = pgTable(
  'meta',
  {
    id: serial('id').primaryKey(),
    set: varchar('set', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    format: integer('format')
      .notNull()
      .references(() => format.id),
    date: varchar('date', { length: 20 }).notNull(),
    season: integer('season').notNull(),
  },
  table => {
    return {
      dateIdx: index('meta-date_idx').on(table.date),
      seasonIdx: index('meta-season_idx').on(table.season),
      setIdx: index('meta-set_idx').on(table.set),
    };
  },
);

export type Meta = InferSelectModel<typeof meta>;
