import {
  pgTable,
  varchar,
  integer,
  primaryKey,
  index,
  uuid,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { tournamentGroup } from './tournament_group.ts';
import type { InferSelectModel } from 'drizzle-orm';

// Tournament Group Leader Base Schema
export const tournamentGroupLeaderBase = pgTable(
  'tournament_group_leader_base',
  {
    tournamentGroupId: uuid('tournament_group_id').notNull(),
    leaderCardId: varchar('leader_card_id').notNull(),
    baseCardId: varchar('base_card_id').notNull(),
    winner: integer('winner').notNull().default(0),
    top8: integer('top8').notNull().default(0),
    total: integer('total').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'tglb-pk',
        columns: [table.tournamentGroupId, table.leaderCardId, table.baseCardId],
      }),
      tournamentGroupIdIdx: index('tglb-tournament_group_id_idx').on(table.tournamentGroupId),
      leaderCardIdIdx: index('tglb-leader_card_id_idx').on(table.leaderCardId),
      baseCardIdIdx: index('tglb-base_card_id_idx').on(table.baseCardId),
      fk: foreignKey({
        name: 'tglb_tournament_group_fk',
        columns: [table.tournamentGroupId],
        foreignColumns: [tournamentGroup.id],
      }).onDelete('cascade'),
    };
  },
);

// Export type
export type TournamentGroupLeaderBase = InferSelectModel<typeof tournamentGroupLeaderBase>;
