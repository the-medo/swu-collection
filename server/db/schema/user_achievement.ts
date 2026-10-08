import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { meleeConnection } from './melee_connection.ts';
import { tournament } from './tournament.ts';

export const userAchievement = pgTable(
  'user_achievement',
  {
    // Unlinking/relinking Melee clears showcases. History refreshes leave them intact.
    userId: text('user_id')
      .notNull()
      .references(() => meleeConnection.userId, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
  },
  table => [
    primaryKey({ columns: [table.userId, table.slot] }),
    unique('user_achievement_user_tournament_unique').on(table.userId, table.tournamentId),
    index('user_achievement_tournament_idx').on(table.tournamentId),
    check('user_achievement_slot_check', sql`${table.slot} > 0`),
  ],
);
