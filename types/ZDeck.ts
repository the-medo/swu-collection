import { z } from 'zod';
import { booleanPreprocessor } from '../shared/lib/zod/booleanPreprocessor.ts';

export const DeckSortField = {
  CREATED_AT: 'deck.created_at',
  UPDATED_AT: 'deck.updated_at',
  NAME: 'deck.name',
  FORMAT: 'deck.format',
  FAVORITES: 'deck_information.favorites_count',
  SCORE: 'deck_information.score',
} as const;

export const zDeckSchema = z.object({
  id: z.guid(),
  userId: z.guid(),
  format: z.number().int(),
  name: z.string().min(3).max(255),
  description: z.string().default(''),
  leaderCardId1: z.string().nullable(),
  leaderCardId2: z.string().nullable(),
  baseCardId: z.string().nullable(),
  public: z.number().int().min(0).max(2),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const zDeckCreateRequest = zDeckSchema
  .pick({
    format: true,
    name: true,
    description: true,
    public: true,
    leaderCardId1: true,
    leaderCardId2: true,
    baseCardId: true,
  })
  .partial({
    description: true,
    leaderCardId1: true,
    leaderCardId2: true,
    baseCardId: true,
  });

export const zDeckUpdateRequest = zDeckSchema
  .pick({
    format: true,
    name: true,
    description: true,
    public: true,
    leaderCardId1: true,
    leaderCardId2: true,
    baseCardId: true,
  })
  .partial();

export const zDeckImportSwudbRequest = z.object({
  swudbDeckId: z.string(),
});

export const zDeckFavoriteRequest = z.object({
  isFavorite: booleanPreprocessor,
});

export const MAX_BULK_DECK_DELETE_COUNT = 100;

export const zDeckBulkDeleteRequest = z.object({
  deckIds: z
    .array(z.guid())
    .min(1)
    .max(MAX_BULK_DECK_DELETE_COUNT)
    .refine(deckIds => new Set(deckIds).size === deckIds.length, {
      message: 'Deck IDs must be unique',
    }),
});

export type ZDeck = z.infer<typeof zDeckSchema>;
export type ZDeckCreateRequest = z.infer<typeof zDeckCreateRequest>;
export type ZDeckUpdateRequest = z.infer<typeof zDeckUpdateRequest>;
export type ZDeckImportSwudbRequest = z.infer<typeof zDeckImportSwudbRequest>;
export type ZDeckFavoriteRequest = z.infer<typeof zDeckFavoriteRequest>;
export type ZDeckBulkDeleteRequest = z.infer<typeof zDeckBulkDeleteRequest>;
