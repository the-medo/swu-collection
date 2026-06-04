import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { deckChangeRequest } from './deck_change_request.ts';
import { user } from './auth-schema.ts';

export const deckChangeRequestEventTypeEnum = pgEnum('deck_change_request_event_type', [
  'submitted',
  'reopened',
  'closed',
  'merged',
  'commented',
]);

export const deckChangeRequestEvent = pgTable(
  'deck_change_request_event',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    changeRequestId: uuid('change_request_id')
      .notNull()
      .references(() => deckChangeRequest.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: deckChangeRequestEventTypeEnum('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    changeRequestIdIdx: index('deck_change_request_event-change_request_id_idx').on(
      table.changeRequestId,
    ),
    actorUserIdIdx: index('deck_change_request_event-actor_user_id_idx').on(table.actorUserId),
    typeIdx: index('deck_change_request_event-type_idx').on(table.type),
  }),
);

export type DeckChangeRequestEvent = InferSelectModel<typeof deckChangeRequestEvent>;
