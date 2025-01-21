import { z } from 'zod';
import { CardCondition, CardLanguage } from './enums.ts';

export const zCollectionCardSchema = z.object({
  collectionId: z.string().uuid(),
  cardId: z.string(),
  variantId: z.string(),
  foil: z.boolean().default(false),
  condition: z.nativeEnum(CardCondition).default(CardCondition.NM),
  language: z.nativeEnum(CardLanguage).default(CardLanguage.EN),
  note: z.string().nullable(),
  amount: z.number().int().min(0),
  amount2: z.number().int().min(0).nullable(),
  price: z.string().nullable(),
});

export const zCollectionCardCreateRequest = zCollectionCardSchema
  .omit({
    collectionId: true, //part of api route
  })
  .partial()
  .required({
    cardId: true,
    variantId: true,
    amount: true,
  });

export const zCollectionCardUpdateRequest = zCollectionCardSchema
  .omit({
    collectionId: true, //part of api route
  })
  .partial()
  .required({
    cardId: true,
    variantId: true,
  });

export type ZCollectionCard = z.infer<typeof zCollectionCardSchema>;
export type ZCollectionCardCreateRequest = z.infer<typeof zCollectionCardCreateRequest>;
export type ZCollectionCardUpdateRequest = z.infer<typeof zCollectionCardUpdateRequest>;

export const fakeCollectionCards: ZCollectionCard[] = [];
