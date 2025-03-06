import { z } from 'zod';

export const zDeckCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string(),
  board: z.number().int().min(1).max(3),
  note: z.string().nullable(),
  quantity: z.number().int().min(1),
});

export const zDeckCardCreateRequest = zDeckCardSchema.omit({ deckId: true }).partial({
  note: true,
});

export const zDeckCardUpdateRequest = z.object({
  id: zDeckCardSchema
    .pick({
      deckId: true,
      cardId: true,
      board: true,
    })
    .required(),
  data: zDeckCardSchema
    .omit({
      deckId: true,
      cardId: true,
      board: true,
    })
    .partial(),
});

export const zDeckCardDeleteRequest = zDeckCardSchema
  .pick({
    deckId: true,
    cardId: true,
    board: true,
  })
  .required();

export type ZDeckCard = z.infer<typeof zDeckCardSchema>;
export type ZDeckCardCreateRequest = z.infer<typeof zDeckCardCreateRequest>;
export type ZDeckCardUpdateRequest = z.infer<typeof zDeckCardUpdateRequest>;
export type ZDeckCardDeleteRequest = z.infer<typeof zDeckCardDeleteRequest>;

export interface DeckCard {
  deckId: string;
  cardId: string;
  board: number;
  note?: string;
  quantity: number;
}
