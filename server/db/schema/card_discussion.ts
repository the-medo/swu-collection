import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { discussion } from './discussion.ts';

// Logical card IDs are shared by all printings and live in the card catalog.
export const cardDiscussion = pgTable('card_discussion', {
  cardId: text('card_id').primaryKey(),
  cardName: text('card_name').notNull(),
  discussionId: uuid('discussion_id')
    .notNull()
    .unique()
    .references(() => discussion.id, { onDelete: 'cascade' }),
});
