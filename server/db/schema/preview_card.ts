import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { PreviewCardPayload, PreviewCardStatus } from '../../lib/cards/previewCardPayload.ts';

export const previewCard = pgTable(
  'preview_card',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    cardId: text('card_id').notNull(),
    status: text('status').$type<PreviewCardStatus>().notNull().default('active'),
    officialCardId: text('official_card_id'),
    payload: jsonb('payload').$type<PreviewCardPayload>().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date().toISOString()),
  },
  table => ({
    cardIdUnique: uniqueIndex('preview_card_card_id_uidx').on(table.cardId),
    statusIdx: index('preview_card_status_idx').on(table.status),
    officialCardIdIdx: index('preview_card_official_card_id_idx').on(table.officialCardId),
    updatedAtIdx: index('preview_card_updated_at_idx').on(table.updatedAt),
  }),
);

export type PreviewCard = InferSelectModel<typeof previewCard>;
export type InsertPreviewCard = InferInsertModel<typeof previewCard>;
