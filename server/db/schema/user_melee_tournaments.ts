import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { meleeConnection } from './melee_connection.ts';
import { tournament } from './tournament.ts';

// Deleting a connection also removes its history, including when an account is relinked.
export const userMeleeTournaments = pgTable(
  'user_melee_tournaments',
  {
    userId: text('user_id')
      .notNull()
      .references(() => meleeConnection.userId, { onDelete: 'cascade' }),
    meleeId: integer('melee_id').notNull(),
    tournamentId: uuid('tournament_id').references(() => tournament.id, { onDelete: 'set null' }),
    meleePlacement: integer('melee_placement'),
    name: text('name').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    format: text('format'),
    attendance: integer('attendance').notNull(),
    record: text('record'),
    decklistId: integer('decklist_id'),
    decklistName: text('decklist_name'),
    status: integer('status').notNull(),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull(),
  },
  table => [
    primaryKey({ columns: [table.userId, table.meleeId] }),
    index('user_melee_tournaments_tournament_idx').on(table.tournamentId),
  ],
);

export const userMeleeTournamentSync = pgTable('user_melee_tournament_sync', {
  userId: text('user_id')
    .primaryKey()
    .references(() => meleeConnection.userId, { onDelete: 'cascade' }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
  refreshToken: uuid('refresh_token'),
});
