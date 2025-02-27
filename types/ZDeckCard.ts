import { z } from 'zod';

export const zDeckCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string(),
  board: z.number().int().min(1).max(3),
  note: z.string().nullable(),
  quantity: z.number().int().min(1),
});

export const zDeckCardCreateRequest = zDeckCardSchema.partial({
  note: true,
});

export const zDeckCardUpdateRequest = zDeckCardSchema.partial({
  note: true,
  quantity: true,
});

export type ZDeckCard = z.infer<typeof zDeckCardSchema>;
export type ZDeckCardCreateRequest = z.infer<typeof zDeckCardCreateRequest>;
export type ZDeckCardUpdateRequest = z.infer<typeof zDeckCardUpdateRequest>;
