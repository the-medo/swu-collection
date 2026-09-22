import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { deck } from './deck.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const deckImportSource = pgTable(
  'deck_import_source',
  {
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' })
      .primaryKey(),
    source: varchar('source').notNull(),
    sourceDeckId: varchar('source_deck_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    refreshedAt: timestamp('refreshed_at').notNull().defaultNow(),
  },
  table => ({
    sourceDeckIdIdx: index('deck_import_source-source_deck_id_idx').on(
      table.source,
      table.sourceDeckId,
    ),
  }),
);

export type DeckImportSource = InferSelectModel<typeof deckImportSource>;
