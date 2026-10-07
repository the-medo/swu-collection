import { check, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import type { SwuAspect } from '../../../types/enums.ts';
import type { HeaderSourceKind } from '../../../types/UserHeader.ts';

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
    headerSource: text('header_source').$type<HeaderSourceKind>().notNull().default('battlefield'),
    headerImageKey: text('header_image_key'),
    // Provenance only: a cropped header survives deletion of its original upload or gallery image.
    headerFileId: uuid('header_file_id'),
    headerGalleryImageId: uuid('header_gallery_image_id'),
    headerLeft: integer('header_left'),
    headerTop: integer('header_top'),
    headerWidth: integer('header_width'),
    headerHeight: integer('header_height'),
  },
  table => [
    check(
      'user_profile_favorite_aspects_check',
      sql`cardinality(${table.favoriteAspects}) <= 3
        AND ${table.favoriteAspects} <@ ARRAY['Command', 'Aggression', 'Cunning', 'Vigilance', 'Heroism', 'Villainy']::text[]
        AND array_position(${table.favoriteAspects}, NULL) IS NULL`,
    ),
  ],
);
