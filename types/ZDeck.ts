import { z } from 'zod';

export const zDeckSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  format: z.number().int(),
  name: z.string().min(3).max(255),
  description: z.string().nullable(),
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

export type ZDeck = z.infer<typeof zDeckSchema>;
export type ZDeckCreateRequest = z.infer<typeof zDeckCreateRequest>;
export type ZDeckUpdateRequest = z.infer<typeof zDeckUpdateRequest>;
