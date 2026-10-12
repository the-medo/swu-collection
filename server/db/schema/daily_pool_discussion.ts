import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { cardPools } from './card_pool.ts';
import { discussion } from './discussion.ts';

export const dailyPoolDiscussion = pgTable('daily_pool_discussion', {
  cardPoolId: uuid('card_pool_id')
    .primaryKey()
    .references(() => cardPools.id, { onDelete: 'cascade' }),
  discussionId: uuid('discussion_id')
    .notNull()
    .unique()
    .references(() => discussion.id, { onDelete: 'cascade' }),
});
