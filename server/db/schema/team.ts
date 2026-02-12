import { pgTable, uuid, varchar, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const teamPrivacyEnum = pgEnum('team_privacy', ['public', 'private']);

export const team = pgTable(
  'team',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    name: varchar('name').notNull(),
    shortcut: varchar('shortcut').unique(),
    description: text('description'),
    logoUrl: text('logo_url'),
    privacy: teamPrivacyEnum('privacy').notNull().default('private'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    shortcutIdx: index('team-shortcut_idx').on(table.shortcut),
  }),
);

export type Team = InferSelectModel<typeof team>;
