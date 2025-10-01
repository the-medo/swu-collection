import { pgTable, text, timestamp, uuid, integer, varchar, index } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { format } from './format.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const deck = pgTable(
  'deck',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    format: integer('format')
      .notNull()
      .references(() => format.id),
    name: varchar('name').notNull().default(''),
    description: varchar('description').notNull().default(''),
    leaderCardId1: varchar('leader_card_id_1'),
    leaderCardId2: varchar('leader_card_id_2'),
    baseCardId: varchar('base_card_id'),
    public: integer('public').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => {
    return {
      userIdIdx: index('deck-user_id_idx').on(table.userId),
      formatIdx: index('deck-format_idx').on(table.format),
      nameIdx: index('deck-name_idx').on(table.leaderCardId1),
      leaderCardId1Idx: index('deck-leader_card_id_1_idx').on(table.leaderCardId1),
      leaderCardId2Idx: index('deck-leader_card_id_2_idx').on(table.leaderCardId2),
      baseCardIdIdx: index('deck-base_card_id_idx').on(table.baseCardId),
      createdAtIdx: index('deck-created_at_idx').on(table.createdAt),
      updatedAtIdx: index('deck-updated_at_idx').on(table.updatedAt),
    };
  },
);

export type Deck = InferSelectModel<typeof deck>;
//export type Deck = InferResponseType<typeof deck>;
