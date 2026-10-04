import { boolean, check, numeric, pgTable, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import type { SwuAspect } from '../../../types/enums.ts';

export const userProfile = pgTable(
  'user_profile',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Logical catalog card IDs; the card catalog is not a database table.
    favoriteLeaderCardId: text('favorite_leader_card_id'),
    favoriteCardId: text('favorite_card_id'),
    favoriteAspects: text('favorite_aspects').array().$type<SwuAspect[]>().notNull().default([]),
    totalSupport: numeric('total_support', { precision: 14, scale: 2 }).notNull().default('0.00'),
    activeSupporter: boolean('active_supporter').notNull().default(false),
  },
  table => [
    check(
      'user_profile_favorite_aspects_check',
      sql`cardinality(${table.favoriteAspects}) <= 3
        AND ${table.favoriteAspects} <@ ARRAY['Command', 'Aggression', 'Cunning', 'Vigilance', 'Heroism', 'Villainy']::text[]
        AND array_position(${table.favoriteAspects}, NULL) IS NULL`,
    ),
    check(
      'user_profile_total_support_check',
      sql`${table.totalSupport} >= 0 AND ${table.totalSupport} < 1000000000000`,
    ),
  ],
);
