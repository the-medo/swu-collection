import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { deck } from './deck.ts';
import { discussion } from './discussion.ts';
import type { PostDocument } from '../../../shared/posts/content.ts';

// Article authorship follows deck ownership; there is one article per deck.
export const deckArticle = pgTable('deck_article', {
  deckId: uuid('deck_id')
    .primaryKey()
    .references(() => deck.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<PostDocument>().notNull(),
  revision: integer('revision').notNull().default(1),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const deckDiscussion = pgTable('deck_discussion', {
  deckId: uuid('deck_id')
    .primaryKey()
    .references(() => deck.id, { onDelete: 'cascade' }),
  discussionId: uuid('discussion_id')
    .notNull()
    .unique()
    .references(() => discussion.id, { onDelete: 'cascade' }),
});
