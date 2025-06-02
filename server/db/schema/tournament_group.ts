import { type InferSelectModel, relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  integer,
  uuid,
  timestamp,
  index,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { meta } from './meta.ts';
import { tournamentGroupTournament } from './tournament_group_tournament.ts';

// Tournament Group Schema
export const tournamentGroup = pgTable(
  'tournament_group',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    metaId: integer('meta_id').references(() => meta.id),
    position: integer('position').notNull().default(0),
    description: text('description'),
    visible: boolean('visible').notNull().default(true),
  },
  table => {
    return {
      metaIdx: index('tournament_group-meta_idx').on(table.metaId),
      positionIdx: index('tournament_group-position_idx').on(table.position),
    };
  },
);

// Tournament Group Relations
export const tournamentGroupRelations = relations(tournamentGroup, ({ one, many }) => ({
  meta: one(meta, {
    fields: [tournamentGroup.metaId],
    references: [meta.id],
  }),
  tournaments: many(tournamentGroupTournament),
}));

export type TournamentGroup = InferSelectModel<typeof tournamentGroup>;
