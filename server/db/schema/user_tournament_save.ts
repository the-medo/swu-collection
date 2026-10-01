import {
  pgTable,
  pgEnum,
  text,
  uuid,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { tournament } from './tournament.ts';
import { tournamentSaveStatuses } from '../../../types/UserTournamentSave.ts';

export const tournamentSaveStatus = pgEnum('tournament_save_status', tournamentSaveStatuses);
export const userTournamentSave = pgTable(
  'user_tournament_save',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    status: tournamentSaveStatus('status').notNull().default('saved'),
    additionalInfo: jsonb('additional_info').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.userId, table.tournamentId] }),
    index('user_tournament_save_tournament_idx').on(table.tournamentId),
  ],
);
