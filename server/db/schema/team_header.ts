import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { team } from './team.ts';

// Separate from the public team record: original upload IDs and crop coordinates are private.
// Validate crop and source rules when saving; retain headers from older policies.
export const teamHeader = pgTable('team_header', {
  teamId: uuid('team_id')
    .primaryKey()
    .references(() => team.id, { onDelete: 'cascade' }),
  source: text('source').$type<'upload' | 'gallery'>().notNull(),
  imageKey: text('image_key').notNull(),
  // Provenance only. Removing an original must not remove the saved header.
  fileId: uuid('file_id'),
  galleryImageId: uuid('gallery_image_id'),
  left: integer('left').notNull(),
  top: integer('top').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
});
