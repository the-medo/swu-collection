import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const entityResource = pgTable(
  'entity_resource',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'deck' or 'tournament'
    entityId: uuid('entity_id').notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceUrl: text('resource_url').notNull(),
    title: varchar('title', { length: 255 }),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => {
    return {
      entityIdx: uniqueIndex('entity_resource_entity_idx').on(
        table.entityType,
        table.entityId,
        table.resourceType,
        table.resourceUrl,
      ),
      entityTypeIdx: index('er_type_idx').on(table.entityType),
      entityIdIdx: index('er_id_idx').on(table.entityId),
      resourceTypeIdx: index('er_resource_type_idx').on(table.resourceType),
    };
  },
);

export type EntityResource = InferSelectModel<typeof entityResource>;
export type EntityResourceInsert = InferInsertModel<typeof entityResource>;
