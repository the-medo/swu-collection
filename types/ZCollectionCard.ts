import { z } from 'zod';
import { CardCondition, CardLanguage, SwuRarity, SwuSet } from './enums.ts';

export const zCollectionCardSchema = z.object({
  collectionId: z.string().uuid(),
  cardId: z.string(),
  variantId: z.string(),
  foil: z.boolean().default(false),
  condition: z.number().int().min(0).max(6),
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
    foil: true,
    condition: true,
    language: true,
    amount: true,
  });

export const zCollectionCardUpdateRequest = z.object({
  id: zCollectionCardSchema
    .pick({
      cardId: true,
      variantId: true,
      foil: true,
      condition: true,
      language: true,
    })
    .required(),
  data: zCollectionCardSchema
    .omit({
      collectionId: true,
      cardId: true,
    })
    .partial(),
});

export const zCollectionCardDeleteRequest = zCollectionCardSchema
  .pick({
    cardId: true,
    variantId: true,
    foil: true,
    condition: true,
    language: true,
  })
  .required();

export const zCollectionBulkInsertRequest = z.object({
  condition: z.number().int().min(0).max(6),
  language: z.nativeEnum(CardLanguage).default(CardLanguage.EN),
  sets: z.array(z.nativeEnum(SwuSet)),
  rarities: z.array(z.nativeEnum(SwuRarity)),
  variants: z.array(z.string()),
  note: z.string().nullable(),
  amount: z.number().int().min(-3).max(3),
});

export type ZCollectionCard = z.infer<typeof zCollectionCardSchema>;
export type ZCollectionCardCreateRequest = z.infer<typeof zCollectionCardCreateRequest>;
export type ZCollectionCardUpdateRequest = z.infer<typeof zCollectionCardUpdateRequest>;
export type ZCollectionCardDeleteRequest = z.infer<typeof zCollectionCardDeleteRequest>;
export type ZCollectionBulkInsertRequest = z.infer<typeof zCollectionBulkInsertRequest>;

export const fakeCollectionCards: ZCollectionCard[] = [];
