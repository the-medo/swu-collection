import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Public, curated artwork. No uploader identity is retained.
export const imageGallery = pgTable(
  'image_gallery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    imageKey: text('image_key').notNull(),
    thumbnailKey: text('thumbnail_key').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('image_gallery_created_idx').on(table.createdAt, table.id),
    check('image_gallery_dimensions_check', sql`${table.width} > 0 AND ${table.height} > 0`),
  ],
);
