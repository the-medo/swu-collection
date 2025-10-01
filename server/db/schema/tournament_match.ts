import { relations } from 'drizzle-orm';
import { pgTable, varchar, integer, boolean, uuid, index } from 'drizzle-orm/pg-core';
import { tournament } from './tournament.ts';
import { deck } from './deck.ts';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// Tournament Matches Schema
export const tournamentMatch = pgTable(
  'tournament_match',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    round: integer('round').notNull(),

    p1Username: varchar('p1_username', { length: 255 }).notNull(),
    p1DeckId: uuid('p1_deck_id')
      .notNull()
      .references(() => deck.id), // references decks table
    p1Points: integer('p1_points').notNull(),

    p2Username: varchar('p2_username', { length: 255 }), //nullable because of BYE
    p2DeckId: uuid('p2_deck_id').references(() => deck.id), // references decks table, nullable because of BYE
    p2Points: integer('p2_points'), //nullable because of BYE

    gameWin: integer('game_win').notNull(),
    gameLose: integer('game_lose').notNull(),
    gameDraw: integer('game_draw').notNull(),
    result: integer('result').notNull(), // 0 if lose, 1 if draw, 3 if win
    isBye: boolean('bye').notNull(),
  },
  table => {
    return {
      round1Idx: index('tournament_match-round_idx').on(table.round),
      username1Idx: index('tournament_match-username1_idx').on(table.p1Username),
      username2Idx: index('tournament_match-username2_idx').on(table.p2Username),
    };
  },
);

// Tournament Matches Relations
export const tournamentMatchRelations = relations(tournamentMatch, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentMatch.tournamentId],
    references: [tournament.id],
  }),
}));

export type TournamentMatch = InferSelectModel<typeof tournamentMatch>;
export type TournamentMatchInsert = InferInsertModel<typeof tournamentMatch>;
