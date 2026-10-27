import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { creatorProfile } from './creator_hub.ts';

export const userFollow = pgTable(
  'user_follow',
  {
    followerUserId: text('follower_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followedUserId: text('followed_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.followerUserId, t.followedUserId] }),
    index('user_follow_target').on(t.followedUserId),
    index('user_follow_list').on(t.followerUserId, t.createdAt.desc(), t.followedUserId),
    check('user_follow_not_self', sql`${t.followerUserId} <> ${t.followedUserId}`),
  ],
);

export const creatorFollow = pgTable(
  'creator_follow',
  {
    followerUserId: text('follower_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfile.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.followerUserId, t.creatorId] }),
    index('creator_follow_target').on(t.creatorId),
    index('creator_follow_list').on(t.followerUserId, t.createdAt.desc(), t.creatorId),
  ],
);
