import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  pgEnum,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

// Enums
export const visibilityEnum = pgEnum('visibility', ['private', 'unlisted', 'public']);
export const cardPoolTypeEnum = pgEnum('card_pool_type', ['prerelease', 'sealed', 'draft']);
export const poolStatusEnum = pgEnum('pool_status', ['in_progress', 'ready']);
export const cardPoolDeckCardLocationEnum = pgEnum('card_pool_deck_card_location', [
  'pool',
  'deck',
  'trash',
]);

// card_pools
export const cardPools = pgTable(
  'card_pools',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    set: text('set'),
    userId: text('user_id').references(() => user.id),
    type: cardPoolTypeEnum('type'),
    name: text('name'),
    description: text('description'),
    leaders: text('leaders'), // concatenated leader card_ids
    edited: boolean('edited').notNull().default(false),
    custom: boolean('custom').notNull().default(false),
    status: poolStatusEnum('status'),
    visibility: visibilityEnum('visibility'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    setIdx: index('cp-set_idx').on(table.set),
    userIdx: index('cp-user_idx').on(table.userId),
    typeIdx: index('cp-type_idx').on(table.type),
    statusIdx: index('cp-status_idx').on(table.status),
    visIdx: index('cp-vis_idx').on(table.visibility),
    createdIdx: index('cp-created_idx').on(table.createdAt),
    updatedIdx: index('cp-updated_idx').on(table.updatedAt),
  }),
);

// card_pool_cards (PK: card_pool_id + card_pool_number)
export const cardPoolCards = pgTable(
  'card_pool_cards',
  {
    cardPoolId: uuid('card_pool_id')
      .notNull()
      .references(() => cardPools.id),
    cardPoolNumber: integer('card_pool_number').notNull(),
    cardId: text('card_id').notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.cardPoolId, table.cardPoolNumber] }),
  }),
);
