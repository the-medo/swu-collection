import { foreignKey, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { discussion, discussionComment } from './discussion.ts';

export const forumThread = pgTable(
  'forum_thread',
  {
    discussionId: uuid('discussion_id')
      .primaryKey()
      .references(() => discussion.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    openingCommentId: uuid('opening_comment_id').notNull(),
  },
  table => [
    foreignKey({
      columns: [table.discussionId, table.openingCommentId],
      foreignColumns: [discussionComment.discussionId, discussionComment.id],
      name: 'forum_thread_opening_comment_fk',
    }).onDelete('cascade'),
    index('forum_thread_author_idx').on(table.authorId),
  ],
);
