import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { collection } from './collection.ts';
import type {
  CollectionImportMatch,
  CollectionImportProblem,
} from '../../../types/CollectionImport.ts';

export const collectionImport = pgTable(
  'collection_import',
  {
    id: uuid('id').primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    requestHash: text('request_hash').notNull(),
    fileName: text('file_name'),
    headers: jsonb('headers').$type<string[]>().notNull(),
    totalRows: integer('total_rows').notNull(),
    importedRows: integer('imported_rows').notNull(),
    importedCopies: integer('imported_copies').notNull(),
    problemRows: integer('problem_rows').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    index('collection_import_collection_created_idx').on(table.collectionId, table.createdAt),
  ],
);

export const collectionImportRow = pgTable(
  'collection_import_row',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    importId: uuid('import_id')
      .notNull()
      .references(() => collectionImport.id, { onDelete: 'cascade' }),
    rowNumber: integer('row_number').notNull(),
    values: jsonb('values').$type<string[]>().notNull(),
    raw: text('raw').notNull(),
    problem: text('problem').$type<CollectionImportProblem>().notNull(),
    message: text('message').notNull(),
    relatedRows: jsonb('related_rows').$type<number[]>().notNull(),
    match: jsonb('match').$type<CollectionImportMatch>(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    resolvedCount: integer('resolved_count'),
  },
  table => [index('collection_import_row_import_idx').on(table.importId, table.rowNumber)],
);
