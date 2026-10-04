import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';

export const userAvatar = pgTable(
  'user_avatar',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
    side: text('side').$type<'front' | 'back'>().notNull(),
    image: text('image').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [check('user_avatar_side_check', sql`${table.side} IN ('front', 'back')`)],
);
