import { type InferSelectModel, relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  integer,
  date,
  uuid,
  timestamp,
  index,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { tournamentType } from './tournament_type.ts';
import { tournamentDeck } from './tournament_deck.ts';
import { tournamentMatch } from './tournament_match.ts';
import { format } from './format.ts';
import { user } from './auth-schema.ts';
import { meta } from './meta.ts';
import { tournamentGroupTournament } from './tournament_group_tournament.ts';

// Tournament Schema
export const tournament = pgTable(
  'tournament',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    type: varchar('type', { length: 50 })
      .notNull()
      .references(() => tournamentType.id),
    location: varchar('location', { length: 255 }).notNull(),
    continent: varchar('continent', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    attendance: integer('attendance').notNull(),
    meleeId: varchar('melee_id', { length: 255 }),
    format: integer('format')
      .notNull()
      .references(() => format.id),
    meta: integer('meta').references(() => meta.id),
    days: integer('days').notNull(),
    dayTwoPlayerCount: integer('day_two_player_count'),
    date: date('date', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    imported: boolean('imported').notNull().default(false),
    bracketInfo: varchar('bracket_info', { length: 50 }).default('top8'),
  },
  table => {
    return {
      dateIdx: index('tournament-date_idx').on(table.date),
      metaIdx: index('tournament-meta_idx').on(table.meta),
    };
  },
);

// Tournament Relations
export const tournamentRelations = relations(tournament, ({ one, many }) => ({
  tournamentType: one(tournamentType, {
    fields: [tournament.type],
    references: [tournamentType.id],
  }),
  decks: many(tournamentDeck),
  matches: many(tournamentMatch),
  tournamentGroups: many(tournamentGroupTournament),
}));

export type Tournament = InferSelectModel<typeof tournament>;
