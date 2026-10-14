import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const cardGroup = pgTable(
  'card_group',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    variantIds: jsonb('variant_ids').$type<string[]>().notNull(),
    published: boolean('published').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => [index('card_group_published_order_idx').on(table.published, table.sortOrder)],
);
