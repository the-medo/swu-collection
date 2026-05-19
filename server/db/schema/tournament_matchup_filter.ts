import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import { format as formatTable } from './format.ts';
import type { MatchupDimensionFilterConfig } from '../../../types/TournamentMatchupFilters.ts';

export const tournamentMatchupFilter = pgTable(
  'tournament_matchup_filter',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    format: integer('format')
      .notNull()
      .references(() => formatTable.id),
    name: varchar('name', { length: 120 }),
    isMirrored: boolean('is_mirrored').notNull().default(false),
    rowFilters: jsonb('row_filters').$type<MatchupDimensionFilterConfig>().notNull(),
    columnFilters: jsonb('column_filters').$type<MatchupDimensionFilterConfig>(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    userFormatUpdatedAtIdx: index('tournament_matchup_filter_user_format_updated_at_idx').on(
      table.userId,
      table.format,
      table.updatedAt,
    ),
  }),
);

export type TournamentMatchupFilter = InferSelectModel<typeof tournamentMatchupFilter>;
export type TournamentMatchupFilterInsert = InferInsertModel<typeof tournamentMatchupFilter>;
