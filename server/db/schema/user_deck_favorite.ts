import { pgTable, text, timestamp, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { deck } from './deck.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const userDeckFavorite = pgTable(
  'user_deck_favorite',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.userId, table.deckId] }),
    };
  },
);

export type UserDeckFavorite = InferSelectModel<typeof userDeckFavorite>;
