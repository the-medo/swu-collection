import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import type { BattlefieldScene } from '../../../shared/types/battlefield.ts';

export const battlefield = pgTable(
  'battlefield',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    scene: jsonb('scene').$type<BattlefieldScene>().notNull(),
    revision: integer('revision').notNull().default(0),
    active: boolean('active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('battlefield_user_idx').on(table.userId),
    uniqueIndex('battlefield_active_user_idx')
      .on(table.userId)
      .where(sql`${table.active} = true`),
    check('battlefield_revision_check', sql`${table.revision} >= 0`),
  ],
);
