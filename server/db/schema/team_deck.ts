import { pgTable, uuid, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { team } from './team.ts';
import { deck } from './deck.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const teamDeck = pgTable(
  'team_deck',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({ columns: [table.teamId, table.deckId] }),
  }),
);

export type TeamDeck = InferSelectModel<typeof teamDeck>;
