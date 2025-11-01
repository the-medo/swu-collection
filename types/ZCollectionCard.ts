import { z } from 'zod';
import { CardLanguage, SwuRarity, SwuSet } from './enums.ts';
import { booleanPreprocessor } from '../shared/lib/zod/booleanPreprocessor.ts';

export const zCollectionCardSchema = z.object({
  collectionId: z.guid(),
  cardId: z.string(),
  variantId: z.string(),
  foil: booleanPreprocessor,
  condition: z.number().int().min(0).max(6),
  language: z.enum(CardLanguage).default(CardLanguage.EN),
  note: z.string().nullable(),
  amount: z.number().int().min(0).max(1000),
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

export const zCollectionCardCreateRequestAllowNegative = zCollectionCardSchema
  .omit({
    collectionId: true, //part of api route
    amount: true, //part of api route
  })
  .partial()
  .required({
    cardId: true,
    variantId: true,
    foil: true,
    condition: true,
    language: true,
  })
  .and(z.object({ amount: z.number().int().min(-1000).max(1000) }));

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
  language: z.enum(CardLanguage).default(CardLanguage.EN),
  sets: z.array(z.enum(SwuSet)),
  rarities: z.array(z.enum(SwuRarity)),
  variants: z.array(z.string()),
  note: z.string().nullable(),
  amount: z.number().int().min(-3).max(3),
});

export const zImportCardSchema = z.object({
  cardId: z.string(),
  variantId: z.string(),
  count: z.number().int().min(1),
  isFoil: booleanPreprocessor,
});

export const zCollectionImportRequest = z.object({
  cards: z.array(zImportCardSchema),
});

export type ZCollectionCard = z.infer<typeof zCollectionCardSchema>;
export type ZCollectionCardCreateRequest = z.infer<typeof zCollectionCardCreateRequest>;
export type ZCollectionCardUpdateRequest = z.infer<typeof zCollectionCardUpdateRequest>;
export type ZCollectionCardDeleteRequest = z.infer<typeof zCollectionCardDeleteRequest>;
export type ZCollectionBulkInsertRequest = z.infer<typeof zCollectionBulkInsertRequest>;
export type ZImportCard = z.infer<typeof zImportCardSchema>;
export type ZCollectionImportRequest = z.infer<typeof zCollectionImportRequest>;

export const fakeCollectionCards: ZCollectionCard[] = [];
