import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Public editorial data only. Catalog credits remain the source of card/printing ownership.
// key is getArtistKey(catalogCredit); name may be curated without breaking catalog links.
export const artist = pgTable('artist', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  biography: text('biography'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const artistLink = pgTable(
  'artist_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artist.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull().default(0),
  },
  table => [index('artist_link_artist_position_idx').on(table.artistId, table.position)],
);

// Explicit editorial associations only. Retain alias profiles and original credits.
export const artistAlias = pgTable(
  'artist_alias',
  {
    key: text('key')
      .primaryKey()
      .references(() => artist.key, { onDelete: 'cascade' }),
    canonicalKey: text('canonical_key')
      .notNull()
      .references(() => artist.key, { onDelete: 'cascade' }),
  },
  table => [
    index('artist_alias_canonical_idx').on(table.canonicalKey),
    check('artist_alias_distinct_keys', sql`${table.key} <> ${table.canonicalKey}`),
  ],
);
