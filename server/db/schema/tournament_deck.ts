import { pgTable, varchar, integer, boolean, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { tournament } from './tournament.ts';
import { type InferSelectModel, relations } from 'drizzle-orm';
import { deck } from './deck.ts';

// Tournament Deck Schema
export const tournamentDeck = pgTable(
  'tournament_deck',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id),
    placement: integer('placement'),
    topRelativeToPlayerCount: boolean('top_relative_to_player_count').notNull(),
    recordWin: integer('record_win').notNull(),
    recordLose: integer('record_lose').notNull(),
    recordDraw: integer('record_draw').notNull(),
    points: integer('points').notNull(),
    meleeDecklistGuid: varchar('melee_decklist_guid', { length: 255 }),
    meleePlayerUsername: varchar('melee_player_username', { length: 255 }),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.tournamentId, table.deckId] }),
    };
  },
);

// Tournament Deck Relations
export const tournamentDeckRelations = relations(tournamentDeck, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentDeck.tournamentId],
    references: [tournament.id],
  }),
}));

export type TournamentDeck = InferSelectModel<typeof tournamentDeck>;
