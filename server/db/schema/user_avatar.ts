import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';

export const userAvatar = pgTable(
  'user_avatar',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    cardId: text('card_id'),
    variantId: text('variant_id'),
    side: text('side').$type<'front' | 'back'>(),
    // Provenance, not a foreign key: the saved avatar survives source deletion.
    fileId: uuid('file_id'),
    image: text('image').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    check('user_avatar_side_check', sql`${table.side} IN ('front', 'back')`),
    check(
      'user_avatar_source_check',
      sql`(${table.fileId} IS NULL AND ${table.cardId} IS NOT NULL AND ${table.variantId} IS NOT NULL AND ${table.side} IS NOT NULL)
        OR (${table.fileId} IS NOT NULL AND ${table.cardId} IS NULL AND ${table.variantId} IS NULL AND ${table.side} IS NULL)`,
    ),
  ],
);
