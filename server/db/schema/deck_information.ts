import { pgTable, text, uuid, integer, index } from 'drizzle-orm/pg-core';
import { deck } from './deck.ts';

export const deckInformation = pgTable(
  'deck_information',
  {
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id)
      .primaryKey(),

    favoritesCount: integer('favorites_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),

    aspectCommand: integer('aspect_command').notNull().default(0),
    aspectVigilance: integer('aspect_vigilance').notNull().default(0),
    aspectAggression: integer('aspect_aggression').notNull().default(0),
    aspectCunning: integer('aspect_cunning').notNull().default(0),
    aspectHeroism: integer('aspect_heroism').notNull().default(0),
    aspectVillainy: integer('aspect_villainy').notNull().default(0),

    baseAspect: text('base_aspect'),
  },
  table => {
    return {
      aspectCommandIdx: index('deck_aspect_command_idx').on(table.aspectCommand),
      aspectVigilanceIdx: index('deck_aspect_vigilance_idx').on(table.aspectVigilance),
      aspectAggressionIdx: index('deck_aspect_aggression_idx').on(table.aspectAggression),
      aspectCunningIdx: index('deck_aspect_cunning_idx').on(table.aspectCunning),
      aspectHeroismIdx: index('deck_aspect_heroism_idx').on(table.aspectHeroism),
      aspectVillainyIdx: index('deck_aspect_villainy_idx').on(table.aspectVillainy),
      baseAspectIdx: index('deck_base_aspect_idx').on(table.baseAspect),
    };
  },
);
