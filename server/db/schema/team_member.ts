import { pgTable, uuid, text, timestamp, primaryKey, pgEnum } from 'drizzle-orm/pg-core';
import { team } from './team.ts';
import { user } from './auth-schema.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const teamRoleEnum = pgEnum('team_role', ['owner', 'member']);

export const teamMember = pgTable(
  'team_member',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: teamRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({ columns: [table.teamId, table.userId] }),
  }),
);

export type TeamMember = InferSelectModel<typeof teamMember>;
