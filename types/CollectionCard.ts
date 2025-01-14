import { z } from 'zod';
import { CardCondition, CardLanguage, SwuSet } from './enums.ts';

export const collectionCardSchema = z.object({
  collectionId: z.string().uuid(),
  cardId: z.string(),
  variantId: z.string(),
  foil: z.boolean().optional().default(false),
  condition: z.nativeEnum(CardCondition),
  language: z.nativeEnum(CardLanguage),
  note: z.string().optional(),
  amount: z.number().int().min(0),
  amount2: z.number().int().min(0).optional(),
  price: z.string(),
});

export type CollectionCard = z.infer<typeof collectionCardSchema>;

export const fakeCollectionCards: CollectionCard[] = [
  /*{ set: SwuSet.SHD, setNumber: 111, owned: 2, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.SOR, setNumber: 222, owned: 5, wanted: 0, foil: true, hyperspace: true },
  { set: SwuSet.TWI, setNumber: 133, owned: 1, wanted: 0, foil: false, hyperspace: false },
  { set: SwuSet.SHD, setNumber: 144, owned: 3, wanted: 0, foil: false, hyperspace: true },
  { set: SwuSet.SOR, setNumber: 55, owned: 6, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.TWI, setNumber: 66, owned: 3, wanted: 0, foil: true, hyperspace: true },
  { set: SwuSet.SHD, setNumber: 77, owned: 4, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.SOR, setNumber: 88, owned: 7, wanted: 0, foil: false, hyperspace: true },
  { set: SwuSet.TWI, setNumber: 99, owned: 2, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.SHD, setNumber: 100, owned: 1, wanted: 0, foil: true, hyperspace: true },*/
];
