// server/db/schema/entity_resource.ts
import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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
    };
  },
);
