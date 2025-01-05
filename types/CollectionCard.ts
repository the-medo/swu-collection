import { SwuSet } from './SwuSet.ts';
import { z } from 'zod';

const userCollectionCardSchema = z.object({
  userId: z.number().int().positive(),
  set: z.nativeEnum(SwuSet),
  setNumber: z.number().int().positive().min(1),
  owned: z.number().int().default(0),
  wanted: z.number().int().default(0),
  foil: z.boolean().optional().default(false),
  hyperspace: z.boolean().optional().default(false),
});

export const collectionCardSchema = userCollectionCardSchema.omit({ userId: true });

export type CollectionCard = z.infer<typeof collectionCardSchema>;

export const fakeCollectionCards: CollectionCard[] = [
  { set: SwuSet.SHD, setNumber: 111, owned: 2, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.SOR, setNumber: 222, owned: 5, wanted: 0, foil: true, hyperspace: true },
  { set: SwuSet.TWI, setNumber: 133, owned: 1, wanted: 0, foil: false, hyperspace: false },
  { set: SwuSet.SHD, setNumber: 144, owned: 3, wanted: 0, foil: false, hyperspace: true },
  { set: SwuSet.SOR, setNumber: 55, owned: 6, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.TWI, setNumber: 66, owned: 3, wanted: 0, foil: true, hyperspace: true },
  { set: SwuSet.SHD, setNumber: 77, owned: 4, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.SOR, setNumber: 88, owned: 7, wanted: 0, foil: false, hyperspace: true },
  { set: SwuSet.TWI, setNumber: 99, owned: 2, wanted: 0, foil: true, hyperspace: false },
  { set: SwuSet.SHD, setNumber: 100, owned: 1, wanted: 0, foil: true, hyperspace: true },
];
