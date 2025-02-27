import { pgTable, uuid, integer, varchar, primaryKey, index } from 'drizzle-orm/pg-core';
import { deck } from './deck.ts';

export const deckCard = pgTable(
  'deck_card',
  {
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id),
    cardId: varchar('card_id').notNull(),
    board: integer('board').notNull().default(1),
    note: varchar('note').notNull().default(''),
    quantity: integer('quantity').notNull(),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'deck_card-pk',
        columns: [table.deckId, table.cardId, table.board],
      }),
      deckIdIdx: index('deck_card-deck_id_idx').on(table.deckId),
      cardIdIdx: index('deck_card-card_id_idx').on(table.cardId),
    };
  },
);
