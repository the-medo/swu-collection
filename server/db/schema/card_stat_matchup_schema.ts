import { pgTable, uuid, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { tournament } from './tournament.ts';
import { deck } from './deck.ts';
import { type InferSelectModel, relations } from 'drizzle-orm';

// Card Stat Matchup Overview Table
export const cardStatMatchupOverview = pgTable(
  'card_stat_matchup_overview',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    userId: text('user_id').references(() => user.id),
    params: text('params').notNull(), // JSON column to store matchup parameters
    createdAt: timestamp('created_at').notNull().defaultNow(),
    finishedAt: timestamp('finished_at'),
  },
  table => {
    return {
      userIdIdx: index('csmo-user_id_idx').on(table.userId),
      createdAtIdx: index('csmo-created_at_idx').on(table.createdAt),
    };
  },
);

// Card Stat Matchup Tournaments Table (Junction table)
export const cardStatMatchupTournaments = pgTable(
  'card_stat_matchup_tournaments',
  {
    id: uuid('id')
      .notNull()
      .references(() => cardStatMatchupOverview.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.id, table.tournamentId] }),
      idIdx: index('csmt-id_idx').on(table.id),
      tournamentIdIdx: index('csmt-tournament_id_idx').on(table.tournamentId),
    };
  },
);

// Card Stat Matchup Decks Table (Junction table)
export const cardStatMatchupDecks = pgTable(
  'card_stat_matchup_decks',
  {
    id: uuid('id')
      .notNull()
      .references(() => cardStatMatchupOverview.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.id, table.deckId] }),
      idIdx: index('csmd-id_idx').on(table.id),
      deckIdIdx: index('csmd-deck_id_idx').on(table.deckId),
    };
  },
);

// Relations
export const cardStatMatchupOverviewRelations = relations(cardStatMatchupOverview, ({ many }) => ({
  tournaments: many(cardStatMatchupTournaments),
  decks: many(cardStatMatchupDecks),
}));

export const cardStatMatchupTournamentsRelations = relations(cardStatMatchupTournaments, ({ one }) => ({
  overview: one(cardStatMatchupOverview, {
    fields: [cardStatMatchupTournaments.id],
    references: [cardStatMatchupOverview.id],
  }),
  tournament: one(tournament, {
    fields: [cardStatMatchupTournaments.tournamentId],
    references: [tournament.id],
  }),
}));

export const cardStatMatchupDecksRelations = relations(cardStatMatchupDecks, ({ one }) => ({
  overview: one(cardStatMatchupOverview, {
    fields: [cardStatMatchupDecks.id],
    references: [cardStatMatchupOverview.id],
  }),
  deck: one(deck, {
    fields: [cardStatMatchupDecks.deckId],
    references: [deck.id],
  }),
}));

// Export types
export type CardStatMatchupOverview = InferSelectModel<typeof cardStatMatchupOverview>;
export type CardStatMatchupTournaments = InferSelectModel<typeof cardStatMatchupTournaments>;
export type CardStatMatchupDecks = InferSelectModel<typeof cardStatMatchupDecks>;