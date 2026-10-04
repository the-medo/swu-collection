import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import { postTypes, type PostDocument } from '../../../shared/posts/content.ts';

export const postType = pgEnum('post_type', postTypes);
export const post = pgTable(
  'post',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: postType('type').notNull(),
    content: jsonb('content').$type<PostDocument>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('post_author_type_idx').on(table.authorId, table.type),
    uniqueIndex('post_profile_author_idx')
      .on(table.authorId)
      .where(sql`${table.type} = 'profile-description'`),
  ],
);
