import { type InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, integer, uuid, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { tournament } from './tournament.ts';
import { tournamentGroup } from './tournament_group.ts';

// Tournament Group Tournament Schema (Join Table)
export const tournamentGroupTournament = pgTable(
  'tournament_group_tournament',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => tournamentGroup.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.tournamentId, table.groupId] }),
      tournamentIdx: index('tournament_group_tournament-tournament_idx').on(table.tournamentId),
      groupIdx: index('tournament_group_tournament-group_idx').on(table.groupId),
      positionIdx: index('tournament_group_tournament-position_idx').on(table.position),
    };
  },
);

// Tournament Group Tournament Relations
export const tournamentGroupTournamentRelations = relations(
  tournamentGroupTournament,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [tournamentGroupTournament.tournamentId],
      references: [tournament.id],
    }),
    group: one(tournamentGroup, {
      fields: [tournamentGroupTournament.groupId],
      references: [tournamentGroup.id],
    }),
  }),
);

export type TournamentGroupTournament = InferSelectModel<typeof tournamentGroupTournament>;
