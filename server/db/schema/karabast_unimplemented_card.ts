import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type KarabastUnimplementedApiRow = {
  id: string;
  setId?: {
    set: string;
    number: number;
  };
  types?: string;
  titleAndSubtitle: string;
  [key: string]: unknown;
};

export const karabastUnimplementedCard = pgTable(
  'karabast_unimplemented_cards',
  {
    // Stores Karabast's titleAndSubtitle value, not only the base title.
    title: text('title').primaryKey(),
    cardId: text('card_id'),
    data: jsonb('data').$type<KarabastUnimplementedApiRow>().notNull(),
  },
  table => ({
    cardIdIdx: index('karabast_unimplemented_cards_card_id_idx').on(table.cardId),
  }),
);

export type KarabastUnimplementedCard = InferSelectModel<typeof karabastUnimplementedCard>;
export type InsertKarabastUnimplementedCard = InferInsertModel<typeof karabastUnimplementedCard>;
