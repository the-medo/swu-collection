import { boolean, index, pgTable, serial, timestamp, uuid } from 'drizzle-orm/pg-core';
import { collection } from './collection.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const collectionSourceCollection = pgTable(
  'collection_source_collection',
  {
    id: serial('id').primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    sourceCollectionId: uuid('source_collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    displayOnSource: boolean('display_on_source').notNull().default(true),
  },
  table => {
    return {
      collectionIdIdx: index('csc-collection_id_idx').on(table.collectionId),
      sourceCollectionIdIdx: index('csc-source_collection_id_idx').on(table.sourceCollectionId),
      displayOnSourceIdx: index('csc-display_on_source_idx').on(table.displayOnSource),
    };
  },
);

export type CollectionSourceCollection = InferSelectModel<typeof collectionSourceCollection>;
