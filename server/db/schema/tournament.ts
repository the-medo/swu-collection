import { relations } from 'drizzle-orm';
import { pgTable, varchar, integer, date, uuid, timestamp, index, text } from 'drizzle-orm/pg-core';
import { tournamentType } from './tournament_type.ts';
import { tournamentDeck } from './tournament_deck.ts';
import { tournamentMatch } from './tournament_match.ts';
import { format } from './format.ts';
import { user } from './auth-schema.ts';

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
    season: integer('season').notNull(),
    set: varchar('set', { length: 50 }).notNull(),
    metaShakeup: varchar('meta_shakeup'),
    location: varchar('location', { length: 255 }).notNull(),
    continent: varchar('continent', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    attendance: integer('attendance').notNull(),
    meleeId: varchar('melee_id', { length: 255 }),
    format: integer('format')
      .notNull()
      .references(() => format.id),
    days: integer('days').notNull(),
    date: date('date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => {
    return {
      dateIdx: index('tournament-date_idx').on(table.date),
      seasonIdx: index('tournament-season_idx').on(table.season),
      setIdx: index('tournament-set_idx').on(table.set),
      metaShakeupIdx: index('tournament-meta_shakeup_idx').on(table.metaShakeup),
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
}));
