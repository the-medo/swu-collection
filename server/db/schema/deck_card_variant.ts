import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { deck } from './deck.ts';
import { user } from './auth-schema.ts';

export const deckCardVariant = pgTable(
  'deck_card_variant',
  {
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date().toISOString()),
  },
  table => ({
    pk: primaryKey({
      name: 'deck_card_variant-pk',
      columns: [table.deckId, table.cardId],
    }),
  }),
);

export const deckCardVariantUserDefault = pgTable(
  'deck_card_variant_user_default',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
    showEverywhere: boolean('show_everywhere').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date().toISOString()),
  },
  table => ({
    pk: primaryKey({
      name: 'deck_card_variant_user_default-pk',
      columns: [table.userId, table.cardId],
    }),
  }),
);

export type DeckCardVariant = InferSelectModel<typeof deckCardVariant>;
export type InsertDeckCardVariant = InferInsertModel<typeof deckCardVariant>;
export type DeckCardVariantUserDefault = InferSelectModel<typeof deckCardVariantUserDefault>;
export type InsertDeckCardVariantUserDefault = InferInsertModel<typeof deckCardVariantUserDefault>;
