import { z } from 'zod';
import { CollectionType } from './enums.ts';

export const zCollectionSchema = z.object({
  id: z.guid(),
  userId: z.guid(),
  title: z.string().min(3).max(255),
  description: z.string(),
  collectionType: z.enum(CollectionType).default(CollectionType.COLLECTION),
  public: z.boolean().default(false),
  forSale: z.boolean().default(false),
  forDecks: z.boolean().default(false),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const zCollectionCreateRequest = zCollectionSchema.pick({
  title: true,
  description: true,
  collectionType: true,
  public: true,
  forSale: true,
  forDecks: true,
});
// .partial({
//   wantlist: true,
//   public: true,
// });

export const zCollectionUpdateRequest = zCollectionSchema
  .pick({
    //id: true, //should be part of api route
    title: true,
    description: true,
    public: true,
    forSale: true,
    forDecks: true,
  })
  .partial();

export const zCollectionDuplicateRequest = z.object({
  title: z.string().min(3).max(255),
  collectionType: z.enum(CollectionType).default(CollectionType.COLLECTION),
  public: z.boolean().default(false),
});

export type ZCollection = z.infer<typeof zCollectionSchema>;
export type ZCollectionCreateRequest = z.infer<typeof zCollectionCreateRequest>;
export type ZCollectionUpdateRequest = z.infer<typeof zCollectionUpdateRequest>;
export type ZCollectionDuplicateRequest = z.infer<typeof zCollectionDuplicateRequest>;
