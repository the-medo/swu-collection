import { z } from 'zod';
import { formatDataById } from './Format.ts';

export const MAX_DECKLIST_CARDS = 60;
export const DECKLIST_CREATION_COOLDOWN_MS = 30_000;
export const MAX_DECKLIST_QUANTITY = 2_147_483_647;
export type DeckBoard = 1 | 2 | 3;

const cardId = z.string().min(1).max(255);
const quantity = z.number().int().min(0).max(MAX_DECKLIST_QUANTITY);
export const zDecklistCards = z
  .record(
    cardId,
    z.strictObject({
      '1': quantity.optional(),
      '2': quantity.optional(),
      '3': quantity.optional(),
    }),
  )
  .refine(cards => Object.keys(cards).length <= MAX_DECKLIST_CARDS, {
    message: `A decklist can contain at most ${MAX_DECKLIST_CARDS} different cards.`,
  });

export const zDeckFromListRequest = z
  .object({
    name: z.string().trim().min(3).max(255).default('Combined deck'),
    format: z
      .number()
      .int()
      .refine(id => !!formatDataById[id], 'Choose a supported deck format.')
      .default(1),
    leaderCardId: cardId,
    leaderCardId2: cardId.optional(),
    baseCardId: cardId,
    cards: zDecklistCards,
  })
  .superRefine((data, ctx) => {
    const twoLeaders = formatDataById[data.format]?.leaderCount === 2;
    if (twoLeaders && (!data.leaderCardId2 || data.leaderCardId2 === data.leaderCardId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['leaderCardId2'],
        message: 'Choose two different leaders for this format.',
      });
    } else if (!twoLeaders && data.leaderCardId2) {
      ctx.addIssue({
        code: 'custom',
        path: ['leaderCardId2'],
        message: 'This format uses one leader.',
      });
    }
  });

export type DecklistCards = z.infer<typeof zDecklistCards>;
export type DeckFromListRequest = z.input<typeof zDeckFromListRequest>;
export type ValidatedDeckFromListRequest = z.output<typeof zDeckFromListRequest>;
