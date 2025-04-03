import { relations } from 'drizzle-orm';
import { pgTable, varchar, integer, date, uuid, timestamp } from 'drizzle-orm/pg-core';
import { tournamentType } from './tournament_type.ts';
import { tournamentDeck } from './tournament_deck.ts';
import { tournamentMatch } from './tournament_match.ts';
import { format } from './format.ts';

// Tournament Schema
export const tournament = pgTable('tournament', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 })
    .notNull()
    .references(() => tournamentType.id),
  location: varchar('location', { length: 255 }).notNull(),
  continent: varchar('continent', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  attendance: integer('attendance').notNull(),
  meleeId: varchar('melee_id', { length: 255 }),
  format: varchar('format', { length: 50 })
    .notNull()
    .references(() => format.id), // references format table
  days: integer('days').notNull(),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tournament Relations
export const tournamentRelations = relations(tournament, ({ one, many }) => ({
  tournamentType: one(tournamentType, {
    fields: [tournament.type],
    references: [tournamentType.id],
  }),
  decks: many(tournamentDeck),
  matches: many(tournamentMatch),
}));
