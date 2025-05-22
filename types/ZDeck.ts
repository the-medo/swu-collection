import { z } from 'zod';

export const DeckSortField = {
  CREATED_AT: 'deck.created_at',
  UPDATED_AT: 'deck.updated_at',
  NAME: 'deck.name',
  FORMAT: 'deck.format',
  FAVORITES: 'deck_information.favorites_count',
  SCORE: 'deck_information.score',
} as const;

export const zDeckSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  format: z.number().int(),
  name: z.string().min(3).max(255),
  description: z.string().default(''),
  leaderCardId1: z.string().nullable(),
  leaderCardId2: z.string().nullable(),
  baseCardId: z.string().nullable(),
  public: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  isFavorite: z.boolean(),
});

export type ZDeck = z.infer<typeof zDeckSchema>;
export type ZDeckCreateRequest = z.infer<typeof zDeckCreateRequest>;
export type ZDeckUpdateRequest = z.infer<typeof zDeckUpdateRequest>;
export type ZDeckImportSwudbRequest = z.infer<typeof zDeckImportSwudbRequest>;
export type ZDeckFavoriteRequest = z.infer<typeof zDeckFavoriteRequest>;
