import { relations } from 'drizzle-orm';
import { pgTable, varchar, integer } from 'drizzle-orm/pg-core';
import { tournament } from './tournament.ts';

// Tournament Type Schema
export const tournamentType = pgTable('tournament_type', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sortValue: integer('sort_value').notNull(),
  major: integer('major').notNull(),
});

// Tournament Type Relations
export const tournamentTypeRelations = relations(tournamentType, ({ many }) => ({
  tournaments: many(tournament),
}));
