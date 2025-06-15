import {
  pgTable,
  integer,
  primaryKey,
  index,
  uuid,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { tournamentGroup } from './tournament_group.ts';
import { type InferSelectModel } from 'drizzle-orm';

// Tournament Group Stats Schema
export const tournamentGroupStats = pgTable(
  'tournament_group_stats',
  {
    tournamentGroupId: uuid('tournament_group_id').notNull(),
    importedTournaments: integer('imported_tournaments').notNull().default(0),
    totalTournaments: integer('total_tournaments').notNull().default(0),
    attendance: integer('attendance').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'tgs-pk',
        columns: [table.tournamentGroupId],
      }),
      tournamentGroupIdIdx: index('tgs-tournament_group_id_idx').on(table.tournamentGroupId),
      fk: foreignKey({
        name: 'tgs_tournament_group_fk',
        columns: [table.tournamentGroupId],
        foreignColumns: [tournamentGroup.id],
      }).onDelete('cascade'),
    };
  },
);

// Export type
export type TournamentGroupStats = InferSelectModel<typeof tournamentGroupStats>;