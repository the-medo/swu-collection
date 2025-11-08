import { pgTable, uuid, integer, index, primaryKey } from 'drizzle-orm/pg-core';
import { visibilityEnum, cardPoolDeckCardLocationEnum, cardPools } from './card_pool.ts';
import { deck } from './deck.ts';
import { user } from './auth-schema.ts';
import { text } from 'drizzle-orm/pg-core';

// card_pool_decks
export const cardPoolDecks = pgTable(
  'card_pool_decks',
  {
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id)
      .primaryKey(),
    cardPoolId: uuid('card_pool_id')
      .notNull()
      .references(() => cardPools.id),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    visibility: visibilityEnum('visibility'),
  },
  table => ({
    deckIdx: index('cpd-deck_idx').on(table.deckId),
    poolIdx: index('cpd-pool_idx').on(table.cardPoolId),
    userIdx: index('cpd-user_idx').on(table.userId),
    visIdx: index('cpd-vis_idx').on(table.visibility),
  }),
);

// card_pool_deck_cards (PK: deck_id + card_pool_number)
export const cardPoolDeckCards = pgTable(
  'card_pool_deck_cards',
  {
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id),
    cardPoolNumber: integer('card_pool_number').notNull(),
    location: cardPoolDeckCardLocationEnum('location').notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.deckId, table.cardPoolNumber] }),
    deckIdx: index('cpdc-deck_idx').on(table.deckId),
    numIdx: index('cpdc-num_idx').on(table.cardPoolNumber),
    locIdx: index('cpdc-loc_idx').on(table.location),
  }),
);
