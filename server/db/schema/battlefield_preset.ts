import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { BattlefieldScene, BattlefieldFaction } from '../../../shared/types/battlefield.ts';

// Shared, deliberately public editorial content, independent of personal slots.
export const battlefieldPreset = pgTable(
  'battlefield_preset',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    scene: jsonb('scene').$type<BattlefieldScene>().notNull(),
    factions: text('factions')
      .array()
      .$type<BattlefieldFaction[]>()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    revision: integer('revision').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('battlefield_preset_created_idx').on(table.createdAt, table.id),
    index('battlefield_preset_factions_idx').using('gin', table.factions),
    check('battlefield_preset_revision_check', sql`${table.revision} >= 0`),
  ],
);
