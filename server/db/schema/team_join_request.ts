import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { team } from './team.ts';
import { user } from './auth-schema.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const teamJoinRequestStatusEnum = pgEnum('team_join_request_status', [
  'pending',
  'approved',
  'rejected',
]);

export const teamJoinRequest = pgTable(
  'team_join_request',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: teamJoinRequestStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    teamIdIdx: index('team_join_request-team_id_idx').on(table.teamId),
    userIdIdx: index('team_join_request-user_id_idx').on(table.userId),
  }),
);

export type TeamJoinRequest = InferSelectModel<typeof teamJoinRequest>;
