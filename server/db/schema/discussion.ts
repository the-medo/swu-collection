import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import type { PostDocument } from '../../../shared/posts/content.ts';

// Resource-specific bindings own access and lifetime; comments only know a discussion.
export const discussion = pgTable('discussion', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});
export const discussionComment = pgTable(
  'discussion_comment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    discussionId: uuid('discussion_id')
      .notNull()
      .references(() => discussion.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    depth: integer('depth').notNull().default(0),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    content: jsonb('content').$type<PostDocument>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'string', withTimezone: true }),
  },
  table => [
    uniqueIndex('discussion_comment_discussion_id_idx').on(table.discussionId, table.id),
    foreignKey({
      columns: [table.discussionId, table.parentId],
      foreignColumns: [table.discussionId, table.id],
      name: 'discussion_comment_parent_fk',
    }).onDelete('cascade'),
    check('discussion_comment_depth_check', sql`${table.depth} BETWEEN 0 AND 5`),
    index('discussion_comment_thread_created_idx').on(
      table.discussionId,
      table.parentId,
      table.createdAt,
      table.id,
    ),
    index('discussion_comment_author_idx').on(table.authorId),
  ],
);
